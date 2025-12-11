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
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function handleRequest(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'AU';
    let address, name, gender, phone;

    // 获取地址
    for (let i = 0; i < 100; i++) {
      const location = getRandomLocationInCountry(country);
      const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`;

      try {
        const response = await safeFetch(apiUrl, {
          headers: { 'User-Agent': 'CF Worker Address Generator' }
        });
        const data = await response.json();

        if (data?.address?.house_number && data?.address?.road && (data.address.city || data.address.town || data.address.village)) {
          address = formatAddress(data.address, country);
          break;
        }
      } catch {}
    }

    if (!address) address = `1 Default Street, Default City, 00000, ${country}`;

    // ✅ 姓名生成（根据国家）
    const { name: genName, gender: genGender } = generateName(country);
    name = genName;
    gender = genGender;

    // 电话
    phone = getRandomPhoneNumber(country);

    // HTML输出
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Real Address Generator</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
  <div class="w-full max-w-3xl bg-white p-6 rounded-2xl shadow-lg">
    <h1 class="text-3xl font-bold mb-6 text-center">Real Address Generator</h1>
    <label class="block mb-2 text-sm text-gray-600">Select Country</label>
    <select id="country" onchange="changeCountry(this.value)" class="mb-6 w-full border rounded p-2">
      ${getCountryOptions(country)}
    </select>

    ${renderField('Name', name)}
    ${renderField('Gender', gender)}
    ${renderField('Phone', phone)}
    ${renderField('Address', address, true)}

    <iframe class="w-full h-64 rounded-lg mt-4" src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed"></iframe>
  </div>

<script>
  function changeCountry(c){ location.href = "?country=" + c; }
  function copyToClipboard(text){ navigator.clipboard.writeText(text); }
</script>
</body></html>
`;

    return new Response(html, { headers: { 'content-type': 'text/html;charset=UTF-8' } });

  } catch (error) {
    return new Response("Error: " + error.message, { status: 500 });
  }
}

// =================== 地址生成 ===================

function getRandomLocationInCountry(country) {
  const countryCoordinates = {
    "AU": [{ lat: -37.8136, lng: 144.9631 }],
    "CH": [{ lat: 47.3769, lng: 8.5417 }],
    "DE": [{ lat: 52.5200, lng: 13.4050 }],
    "KZ": [
      { lat: 51.1605, lng: 71.4704 }, // Astana
      { lat: 43.2383, lng: 76.9458 }, // Almaty
      { lat: 50.2839, lng: 57.1660 }  // Aktobe
    ]
  };

  const coords = countryCoordinates[country] || countryCoordinates["AU"];
  const city = coords[Math.floor(Math.random() * coords.length)];
  return {
    lat: city.lat + (Math.random() - 0.5) * 0.1,
    lng: city.lng + (Math.random() - 0.5) * 0.1
  };
}

function formatAddress(address, country) {
  const city = address.city || address.town || address.village;
  const postcode = address.postcode || '';
  return `${address.house_number} ${address.road}, ${city}, ${postcode}, ${country}`;
}

// =================== 电话号码 ===================

function getRandomPhoneNumber(country) {
  const formats = {
    "KZ": () => {
      const prefix = ['701','702','707','747','775','776','777'][Math.floor(Math.random()*7)];
      return `+7 ${prefix} ${Math.floor(1000000 + Math.random() * 9000000)}`;
    },
    "AU": () => `+61 4 ${Math.floor(1000+Math.random()*9000)} ${Math.floor(1000+Math.random()*9000)}`,
    "CH": () => `+41 7${Math.floor(Math.random()*9)} ${Math.floor(1000000+Math.random()*9000000)}`,
    "DE": () => `+49 15${Math.floor(Math.random()*9)} ${Math.floor(1000000+Math.random()*9000000)}`
  };
  return formats[country] ? formats[country]() : formats["AU"]();
}

// =================== ✅ 姓名库 ===================

function generateName(country) {

  // 哈萨克姓名库（真实 + 常用）
  const kzMale = ["Aidos", "Nursultan", "Alikhan", "Yernar", "Askar", "Daniyar", "Bakhtiyar", "Miras"];
  const kzFemale = ["Aigerim", "Dana", "Zhanel", "Madina", "Altynai", "Mira", "Aruzhan", "Kamila"];
  const kzLast = ["Nazarbayev", "Mukhamedov", "Sarsembayev", "Tulegenov", "Adilbekov", "Kassymov", "Rakhimzhanov"];

  if (country === "KZ") {
    const isMale = Math.random() < 0.5;
    const first = isMale ? kzMale[Math.floor(Math.random()*kzMale.length)]
                         : kzFemale[Math.floor(Math.random()*kzFemale.length)];
    const last = kzLast[Math.floor(Math.random()*kzLast.length)];
    return { name: `${first} ${last}`, gender: isMale ? "Male" : "Female" };
  }

  // 其他国家默认英文
  return { name: "Alex Smith", gender: "Unknown" };
}

// =================== UI ===================

function getCountryOptions(c) {
  const list = [
    { name: "Australia", code: "AU" },
    { name: "Switzerland", code: "CH" },
    { name: "Germany", code: "DE" },
    { name: "Kazakhstan", code: "KZ" }
  ];
  return list.map(x => `<option value="${x.code}" ${c===x.code?'selected':''}>${x.name}</option>`).join('');
}

function renderField(label, value, multi=false) {
  return `
    <div class="mb-3">
      <div class="flex justify-between">
        <span class="text-gray-600">${label}</span>
        <button onclick="copyToClipboard('${value}')" class="text-blue-600 text-sm">Copy</button>
      </div>
      <div class="p-2 border rounded bg-gray-50">${value}</div>
    </div>`;
}tContent,
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

