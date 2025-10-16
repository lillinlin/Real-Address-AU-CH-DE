addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function safeFetch(url, options = {}, retries = 3, timeout = 5000) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) return response;
    } catch (e) {
      console.warn(`Fetch failed (${i + 1}/${retries}):`, e.message);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000)); // 重试间隔
    }
  }
}

async function handleRequest(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'AU';
    let address, name, gender, phone;

    // 尝试最多100次获取有效地址
    for (let i = 0; i < 100; i++) {
      const location = getRandomLocationInCountry(country);
      const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`;

      try {
        const response = await safeFetch(apiUrl, {
          headers: { 'User-Agent': 'CF Worker Address Generator' }
        });
        const data = await response.json();

        if (data?.address?.house_number && data.address.road && (data.address.city || data.address.town || data.address.village)) {
          address = formatAddress(data.address, country);
          break;
        }
      } catch (err) {
        console.warn('Nominatim fetch failed:', err.message);
      }
    }

    if (!address) {
      address = `1 Default Street, Default City, 00000, ${country}`;
    }

    // 获取随机姓名
    try {
      const nat = country === 'CH' ? 'ch' : country === 'DE' ? 'de' : 'au';
      const userData = await safeFetch('https://randomuser.me/api/?nat=' + nat);
      const userJson = await userData.json();
      if (userJson?.results?.length > 0) {
        const user = userJson.results[0];
        name = `${user.name.first} ${user.name.last}`;
        gender = user.gender.charAt(0).toUpperCase() + user.gender.slice(1);
      } else throw new Error('Empty randomuser response');
    } catch (error) {
      console.warn('randomuser API error:', error.message);
      name = "Alex Smith";
      gender = "Unknown";
    }

    phone = getRandomPhoneNumber(country);

    // HTML 界面
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Real Address Generator</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: 'Inter', sans-serif; background-color: #f7fafc; }
        ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from {opacity:0;transform:translateY(-10px);} to {opacity:1;transform:translateY(0);} }
      </style>
    </head>
    <body class="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
      <div id="copied-toast" class="fixed top-5 bg-green-500 text-white py-2 px-5 rounded-lg shadow-lg text-sm transition-transform duration-300 transform -translate-y-20">Copied!</div>
      <div class="w-full max-w-4xl mx-auto">
        <header class="text-center mb-8">
          <h1 class="text-3xl sm:text-4xl font-bold text-gray-800">Real Address Generator</h1>
        </header>
        <main class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white p-6 rounded-2xl shadow-lg flex flex-col gap-6 fade-in">
            <div>
              <label for="country" class="block text-sm font-medium text-gray-600 mb-2">Select Country</label>
              <select id="country" onchange="changeCountry(this.value)" class="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                ${getCountryOptions(country)}
              </select>
            </div>
            <div class="space-y-4">
              ${renderField('Name', name)}
              ${renderField('Gender', gender)}
              ${renderField('Phone', phone)}
              ${renderField('Address', address, true)}
            </div>
            <iframe class="w-full h-64 rounded-xl" src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed"></iframe>
            <div class="grid grid-cols-2 gap-4">
              <button onclick="window.location.href = window.location.pathname + '?country=' + document.getElementById('country').value" class="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Get Another</button>
              <button onclick="saveAddress()" class="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600">Save</button>
            </div>
          </div>
          <div class="bg-white p-6 rounded-2xl shadow-lg fade-in">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Saved Addresses</h2>
            <div id="savedAddressesContainer" class="space-y-3 max-h-[600px] overflow-y-auto pr-2"></div>
          </div>
        </main>
      </div>
      <script>
        ${renderClientScript()}
      </script>
    </body>
    </html>
    `;

    return new Response(html, { headers: { 'content-type': 'text/html;charset=UTF-8' } });

  } catch (error) {
    console.error('Worker script failed:', error);
    return new Response(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h1 style="color:#e53e3e;">Service Temporarily Unavailable</h1>
        <p>We’re having trouble connecting to data providers. Please try again in a moment.</p>
        <p style="color:grey;font-size:0.9em;">Error: ${error.message}</p>
        <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#3182ce;color:white;border:none;border-radius:8px;cursor:pointer;">Retry</button>
      </body></html>
    `, { status: 503, headers: { 'content-type': 'text/html;charset=UTF-8' } });
  }
}

// ======= 后端辅助函数 =======
function getRandomLocationInCountry(country) {
  const countryCoordinates = {
    "AU": [{ lat: -37.8136, lng: 144.9631 }],
    "CH": [{ lat: 47.3769, lng: 8.5417 }],
    "DE": [{ lat: 52.5200, lng: 13.4050 }]
  };
  const coordsArray = countryCoordinates[country];
  const city = coordsArray[Math.floor(Math.random() * coordsArray.length)];
  const lat = city.lat + (Math.random() - 0.5) * 0.1;
  const lng = city.lng + (Math.random() - 0.5) * 0.1;
  return { lat, lng };
}

function formatAddress(address, country) {
  const city = address.city || address.town || address.village;
  const postcode = address.postcode || '';
  return `${address.house_number} ${address.road}, ${city}, ${postcode}, ${country}`;
}

function getRandomPhoneNumber(country) {
  const phoneFormats = {
    "AU": () => `+61 4 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
    "CH": () => {
      const prefix = ['75','76','77','78','79'][Math.floor(Math.random() * 5)];
      return `+41 ${prefix} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)}`;
    },
    "DE": () => {
      const prefix = ['151','152','160','170','171','172','173','174','175'][Math.floor(Math.random() * 9)];
      const rest = Array.from({length:7},()=>Math.floor(Math.random()*10)).join('');
      return `+49 ${prefix} ${rest}`;
    }
  };
  return phoneFormats[country] ? phoneFormats[country]() : 'Invalid country code';
}

function getCountryOptions(selectedCountry) {
  const countries = [
    { name: "Australia", code: "AU" },
    { name: "Switzerland", code: "CH" },
    { name: "Germany", code: "DE" }
  ];
  return countries.map(({ name, code }) =>
    `<option value="${code}" ${code === selectedCountry ? 'selected' : ''}>${name}</option>`
  ).join('');
}

// ======= 前端模板片段 =======
function renderField(label, value, isAddress = false) {
  const id = `info-${label.toLowerCase()}`;
  return `
  <div class="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
    <span class="text-gray-500 mt-1">${label}</span>
    <span id="${id}" class="font-semibold text-gray-800 ${isAddress ? 'text-right w-2/3' : ''}">${value}</span>
    <button onclick="copyToClipboard('${value.replace(/'/g, "\\'")}', this)" class="p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
  </div>`;
}

function renderClientScript() {
  return `
    function copyToClipboard(text, button) {
      navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('copied-toast');
        toast.style.transform = 'translateY(0)';
        setTimeout(() => { toast.style.transform = 'translateY(-5rem)'; }, 2000);
      });
    }
    function changeCountry(country) {
      window.location.href = window.location.pathname + '?country=' + country;
    }
    function saveAddress() {
      const note = prompt('Add a note (optional)', '');
      try {
        const saved = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
        const newEntry = {
          note: note || 'No notes',
          name: document.getElementById('info-name').textContent,
          gender: document.getElementById('info-gender').textContent,
          phone: document.getElementById('info-phone').textContent,
          address: document.getElementById('info-address').textContent
        };
        saved.unshift(newEntry);
        localStorage.setItem('savedAddresses', JSON.stringify(saved));
        renderSavedAddresses();
      } catch(e) { alert("Error saving address"); }
    }
    function renderSavedAddresses() {
      const saved = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
      const container = document.getElementById('savedAddressesContainer');
      container.innerHTML = saved.length ? '' : '<p class="text-center text-gray-400 mt-10">No saved addresses yet.</p>';
      saved.forEach((entry, i) => {
        const card = document.createElement('div');
        card.className = 'p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow';
        card.innerHTML = '<div class="flex justify-between items-start">' +
          '<p class="font-bold text-gray-700">' + entry.note + '</p>' +
          '<button onclick="deleteAddress(' + i + ')" class="text-gray-400 hover:text-red-500">✕</button></div>' +
          '<div class="mt-2 text-sm text-gray-600 space-y-1">' +
          '<p><b>Name:</b> ' + entry.name + '</p>' +
          '<p><b>Phone:</b> ' + entry.phone + '</p>' +
          '<p><b>Address:</b> ' + entry.address + '</p></div>';
        container.appendChild(card);
      });
    }
    function deleteAddress(i) {
      const saved = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
      saved.splice(i, 1);
      localStorage.setItem('savedAddresses', JSON.stringify(saved));
      renderSavedAddresses();
    }
    window.onload = renderSavedAddresses;
  `;
}
