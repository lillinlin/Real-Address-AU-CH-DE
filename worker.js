// 监听所有传入的 fetch 事件
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * 处理传入的请求并返回一个 HTML 响应
 * @param {Request} request
 */
async function handleRequest(request) {
  // 使用 try...catch 作为“安全网”，捕获所有潜在的异常
  try {
    const { searchParams } = new URL(request.url)
    // 默认国家设置为瑞士 (CH)，如果 URL 参数中指定了国家，则使用该参数
    const country = searchParams.get('country') || 'AU'
    let address, name, gender, phone

    // 尝试最多100次以获取一个有效的详细地址
    for (let i = 0; i < 100; i++) {
      const location = getRandomLocationInCountry(country)
      // 使用 OpenStreetMap 的 Nominatim API 进行反向地理编码
      const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`

      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Cloudflare Worker for Real Address Generator' } // 推荐添加一个明确的 User-Agent
      })
      const data = await response.json()

      // 检查返回的数据是否包含必要的地址信息
      if (data && data.address && data.address.house_number && data.address.road && (data.address.city || data.address.town || data.address.village)) {
        address = formatAddress(data.address, country)
        break // 成功获取地址后退出循环
      }
    }

    // 如果循环100次后仍未获取到地址，则主动抛出一个错误
    if (!address) {
      throw new Error('Failed to retrieve a detailed address after multiple attempts.');
    }

    // 使用 randomuser.me API 获取随机用户数据（姓名、性别）
    try {
      const userData = await fetch('https://randomuser.me/api/?nat=' + (country === 'CH' ? 'ch' : 'au')) // 根据国家获取更匹配的人名
      const userJson = await userData.json()
      if (userJson && userJson.results && userJson.results.length > 0) {
        const user = userJson.results[0]
        name = `${user.name.first} ${user.name.last}`
        gender = user.gender.charAt(0).toUpperCase() + user.gender.slice(1)
      } else {
        throw new Error('Invalid API response from randomuser.me');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // 如果 API 请求失败，则使用备用数据
      name = "Alex Smith"
      gender = "Unknown"
    }
    
    phone = getRandomPhoneNumber(country)

  // 包含了所有UI和逻辑的HTML模板字符串
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Real Address Generator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Inter', sans-serif;
        background-color: #f7fafc;
      }
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #f1f1f1; }
      ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      .fade-in { animation: fadeIn 0.5s ease-in-out; }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .btn-press:active { transform: scale(0.95); transition: transform 0.1s; }
    </style>
  </head>
  <body class="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">

    <div id="copied-toast" class="fixed top-5 bg-green-500 text-white py-2 px-5 rounded-lg shadow-lg text-sm transition-transform duration-300 transform -translate-y-20">
      Copied!
    </div>

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
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-gray-500">Name</span>
              <span id="info-name" class="font-semibold text-gray-800">${name}</span>
              <button onclick="copyToClipboard('${name.replace(/'/g, "\\'")}', this)" class="p-2 rounded-full hover:bg-gray-200 transition-colors btn-press">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-gray-500">Gender</span>
              <span id="info-gender" class="font-semibold text-gray-800">${gender}</span>
              <button onclick="copyToClipboard('${gender}', this)" class="p-2 rounded-full hover:bg-gray-200 transition-colors btn-press">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-gray-500">Phone</span>
              <span id="info-phone" class="font-semibold text-gray-800">${phone}</span>
              <button onclick="copyToClipboard('${phone.replace(/[()\\s-]/g, '')}', this)" class="p-2 rounded-full hover:bg-gray-200 transition-colors btn-press">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
            <div class="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-gray-500 mt-1">Address</span>
              <span id="info-address" class="font-semibold text-gray-800 text-right w-2/3">${address}</span>
              <button onclick="copyToClipboard('${address.replace(/'/g, "\\'")}', this)" class="p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0 btn-press">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>
          
          <iframe class="w-full h-64 rounded-xl" src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed"></iframe>
          
          <div class="grid grid-cols-2 gap-4">
            <button onclick="window.location.href = window.location.pathname + '?country=' + document.getElementById('country').value" class="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all btn-press">Get Another Address</button>
            <button onclick="saveAddress()" class="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition-all btn-press">Save Address</button>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-lg fade-in" style="animation-delay: 0.1s;">
          <h2 class="text-xl font-bold text-gray-800 mb-4">Saved Addresses</h2>
          <div id="savedAddressesContainer" class="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            <!-- Saved addresses will be rendered here by JavaScript -->
          </div>
        </div>
      </main>

      <footer class="text-center mt-8">
        <a href="https://github.com/lillinlin/Real-Address" target="_blank" class="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          GitHub
        </a>
      </footer>
    </div>

    <script>
      // 复制到剪贴板功能
      function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
          const toast = document.getElementById('copied-toast');
          toast.style.transform = 'translateY(0)';
          setTimeout(() => {
            toast.style.transform = 'translateY(-5rem)';
          }, 2000);
          
          if(button) {
              const originalIcon = button.innerHTML;
              button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
              setTimeout(() => {
                  button.innerHTML = originalIcon;
              }, 1500);
          }
        }).catch(err => {
          console.error('Could not copy text: ', err);
        });
      }

      // 更改国家功能
      function changeCountry(country) {
         window.location.href = window.location.pathname + '?country=' + country;
      }

      // 保存地址功能
      function saveAddress() {
        const note = prompt('Please enter a note (optional)', '');
        // 使用 try-catch 保证即使 localStorage 有问题，页面也不会崩溃
        try {
          const savedAddresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
          
          const newEntry = {
            note: note || 'No notes',
            name: document.getElementById('info-name').textContent,
            gender: document.getElementById('info-gender').textContent,
            phone: document.getElementById('info-phone').textContent,
            address: document.getElementById('info-address').textContent
          };
          
          savedAddresses.unshift(newEntry);
          localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));
          renderSavedAddresses();
        } catch (e) {
          console.error("Could not save address to localStorage", e);
          alert("Error: Could not save address. Your browser might be blocking localStorage.");
        }
      }
      
      // 渲染保存的地址
      function renderSavedAddresses() {
        try {
          const savedAddresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
          const container = document.getElementById('savedAddressesContainer');
          container.innerHTML = '';
          
          if (savedAddresses.length === 0) {
              container.innerHTML = '<p class="text-center text-gray-400 mt-10">No saved addresses yet.</p>';
              return;
          }

          savedAddresses.forEach((entry, index) => {
            const card = document.createElement('div');
            card.className = 'p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300';
            card.innerHTML = \`
              <div class="flex justify-between items-start">
                <p class="font-bold text-gray-700">\${entry.note.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                <button onclick="deleteAddress(\${index})" class="text-gray-400 hover:text-red-500 transition-colors btn-press">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div class="mt-2 text-sm text-gray-600 space-y-1">
                <p><span class="font-medium">Name:</span> \${entry.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                <p><span class="font-medium">Phone:</span> \${entry.phone.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                <p><span class="font-medium">Address:</span> \${entry.address.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              </div>
            \`;
            container.appendChild(card);
          });
        } catch (e) {
          console.error("Could not render saved addresses from localStorage", e);
        }
      }

      // 删除地址功能
      function deleteAddress(index) {
          try {
            const savedAddresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
            savedAddresses.splice(index, 1);
            localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));
            renderSavedAddresses();
          } catch(e) {
            console.error("Could not delete address from localStorage", e);
          }
      }

      // 页面加载时渲染
      window.onload = function() {
        renderSavedAddresses();
      };
    </script>
  </body>
  </html>
  `;

    // 返回 HTML 响应
    return new Response(html, {
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  } catch (error) {
    // 如果 try 块中发生任何错误，则捕获它
    console.error('Worker script failed:', error);
    // 返回一个友好的错误页面，而不是让 Worker 崩溃
    return new Response(`
      <div style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h1>Oops! Something went wrong.</h1>
        <p>We couldn't generate an address right now. Please try refreshing the page.</p>
        <p style="color: grey; font-size: 0.8em;">Error: ${error.message}</p>
      </div>
    `, { 
      status: 500,
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
  }
}

/**
 * 根据国家代码返回一个随机的经纬度坐标
 * @param {string} country - 国家代码 (e.g., "AU", "CH")
 * @returns {{lat: number, lng: number}}
 */
function getRandomLocationInCountry(country) {
  // 定义每个国家的一个或多个城市坐标
  const countryCoordinates = {
    "AU": [{ lat: -37.8136, lng: 144.9631 }], // 只保留墨尔本
    "CH": [{ lat: 47.3769, lng: 8.5417 }]      // 只保留苏黎世
  }
  const coordsArray = countryCoordinates[country]
  const city = coordsArray[Math.floor(Math.random() * coordsArray.length)]
  // 在城市坐标基础上添加一个小的随机偏移量，以生成不同的地址
  const lat = city.lat + (Math.random() - 0.5) * 0.1
  const lng = city.lng + (Math.random() - 0.5) * 0.1
  return { lat, lng }
}

/**
 * 将从 API 获取的地址对象格式化为字符串
 * @param {object} address - Nominatim API 返回的地址对象
 * @param {string} country - 国家代码
 * @returns {string}
 */
function formatAddress(address, country) {
  const city = address.city || address.town || address.village;
  const postcode = address.postcode || '';
  // 拼接地址字符串
  return `${address.house_number} ${address.road}, ${city}, ${postcode}, ${country}`;
}

/**
 * 根据国家代码生成一个随机的电话号码
 * @param {string} country - 国家代码
 * @returns {string}
 */
function getRandomPhoneNumber(country) {
  const phoneFormats = {
    "AU": () => {
      const number = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('')
      return `+61 4 ${number.slice(0,4)} ${number.slice(4)}`;
    },
    "CH": () => {
      const prefix = ['75', '76', '77', '78', '79'][Math.floor(Math.random() * 5)];
      const number1 = Math.floor(100 + Math.random() * 900).toString();
      const number2 = Math.floor(10 + Math.random() * 90).toString();
      const number3 = Math.floor(10 + Math.random() * 90).toString();
      return `+41 ${prefix} ${number1} ${number2} ${number3}`;
    }
  }
  return phoneFormats[country] ? phoneFormats[country]() : 'Invalid country code';
}

/**
 * 生成国家选择器的 HTML <option> 标签
 * @param {string} selectedCountry - 当前选中的国家代码
 * @returns {string}
 */
function getCountryOptions(selectedCountry) {
  const countries = [
    { name: "Australia", code: "AU" },
    { name: "Switzerland", code: "CH" }
  ]
  return countries.map(({ name, code }) => 
    `<option value="${code}" ${code === selectedCountry ? 'selected' : ''}>${name}</option>`
  ).join('')
}
