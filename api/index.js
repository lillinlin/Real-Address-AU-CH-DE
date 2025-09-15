// 导入需要的模块，在 Vercel Functions 中，fetch 是全局可用的
// 这段代码是为 Vercel Functions 设计的，它会在 Node.js 环境中运行。
// 它会将 HTTP 请求作为参数传入导出的函数，然后将返回值作为响应。

/**
 * 这是 Vercel Functions 的入口函数。
 * 它接收一个请求对象，并返回一个响应对象。
 * @param {Request} request - 从 Vercel 传入的请求对象
 */
export default async function handler(request) {
  // 使用 try...catch 作为“安全网”，捕获所有潜在的异常
  try {
    const { searchParams } = new URL(request.url)
    // 默认国家设置为澳大利亚 (AU)，如果 URL 参数中指定了国家，则使用该参数
    const country = searchParams.get('country') || [span_0](start_span)'AU'[span_0](end_span)
    let address, name, gender, phone

    // 尝试最多100次以获取一个有效的详细地址
    for (let i = 0; i < 100; i++) {
      const location = getRandomLocationInCountry(country)
      // 使用 OpenStreetMap 的 Nominatim API 进行反向地理编码
      const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`

      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Vercel Function for Real Address Generator' } // Vercel 建议添加一个明确的 User-Agent
      })
      [span_1](start_span)const data = await response.json()[span_1](end_span)

      // 检查返回的数据是否包含必要的地址信息
      if (data && data.address && data.address.house_number && data.address.road && (data.address.city || data.address.town || data.address.village)) {
        [span_2](start_span)address = formatAddress(data.address, country)[span_2](end_span)
        break // 成功获取地址后退出循环
      }
    }

    // 如果循环100次后仍未获取到地址，则主动抛出一个错误
    if (!address) {
      [span_3](start_span)throw new Error('Failed to retrieve a detailed address after multiple attempts.');[span_3](end_span)
    }

    // 使用 randomuser.me API 获取随机用户数据（姓名、性别）
    try {
      // 根据国家获取更匹配的人名
      [span_4](start_span)const userData = await fetch('https://randomuser.me/api/?nat=' + (country === 'CH' ? 'ch' : 'au'))[span_4](end_span)
      [span_5](start_span)const userJson = await userData.json()[span_5](end_span)
      if (userJson && userJson.results && userJson.results.length > 0) {
        [span_6](start_span)const user = userJson.results[0][span_6](end_span)
        [span_7](start_span)name = `${user.name.first} ${user.name.last}`[span_7](end_span)
        [span_8](start_span)gender = user.gender.charAt(0).toUpperCase() + user.gender.slice(1)[span_8](end_span)
      } else {
        [span_9](start_span)throw new Error('Invalid API response from randomuser.me');[span_9](end_span)
      }
    } catch (error) {
      [span_10](start_span)console.error('Failed to fetch user data:', error);[span_10](end_span)
      // 如果 API 请求失败，则使用备用数据
      [span_11](start_span)name = "Alex Smith"[span_11](end_span)
      [span_12](start_span)gender = "Unknown"[span_12](end_span)
    }

    [span_13](start_span)phone = getRandomPhoneNumber(country)[span_13](end_span)

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
      [span_14](start_span)}
        ::-webkit-scrollbar { width: 8px; }[span_14](end_span)
        ::-webkit-scrollbar-track { background: #f1f1f1; [span_15](start_span)}
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }[span_15](end_span)
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; [span_16](start_span)}
        .fade-in { animation: fadeIn 0.5s ease-in-out; }[span_16](end_span)
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); [span_17](start_span)}
          to { opacity: 1; transform: translateY(0); }[span_17](end_span)
        }
        .btn-press:active { transform: scale(0.95); transition: transform 0.1s; [span_18](start_span)}
      </style>
    </head>
    <body class="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">

      <div id="copied-toast" class="fixed top-5 bg-green-500 text-white py-2 px-5 rounded-lg shadow-lg text-sm transition-transform duration-300 transform -translate-y-20">
        Copied[span_18](end_span)!
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
                [span_19](start_span)${getCountryOptions(country)}[span_19](end_span)
              </select>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              
                [span_20](start_span)<span class="text-gray-500">Name</span>[span_20](end_span)
                [span_21](start_span)<span id="info-name" class="font-semibold text-gray-800">${name}</span>[span_21](end_span)
                <button onclick="copyToClipboard('${name.replace(/'/g, "\\'")}', this)" class="p-2 rounded-full hover:bg-gray-200 transition-colors btn-press">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  [span_22](start_span)</button>[span_22](end_span)
              </div>
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                [span_23](start_span)<span class="text-gray-500">Gender</span>[span_23](end_span)
                [span_24](start_span)<span id="info-gender" class="font-semibold text-gray-800">${gender}</span>[span_24](end_span)
                <button onclick="copyToClipboard('${gender}', this)" class="p-2 rounded-full hover:bg-gray-200 transition-colors btn-press">
      
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                [span_25](start_span)</button>[span_25](end_span)
              </div>
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    
                [span_26](start_span)<span class="text-gray-500">Phone</span>[span_26](end_span)
                [span_27](start_span)<span id="info-phone" class="font-semibold text-gray-800">${phone}</span>[span_27](end_span)
                <button onclick="copyToClipboard('${phone.replace(/[()\\s-]/g, '')}', this)" class="p-2 rounded-full hover:bg-gray-200 transition-colors btn-press">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                [span_28](start_span)</button>[span_28](end_span)
              </div>
              <div class="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                [span_29](start_span)<span class="text-gray-500 mt-1">Address</span>[span_29](end_span)
                [span_30](start_span)<span id="info-address" class="font-semibold text-gray-800 text-right w-2/3">${address}</span>[span_30](end_span)
              
                <button onclick="copyToClipboard('${address.replace(/'/g, "\\'")}', this)" class="p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0 btn-press">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                [span_31](start_span)</button>[span_31](end_span)
              </div>
        
            [span_32](start_span)</div>[span_32](end_span)
            
            [span_33](start_span)<iframe class="w-full h-64 rounded-xl" src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed"></iframe>[span_33](end_span)
            
            <div class="grid grid-cols-2 gap-4">
              <button onclick="window.location.href = window.location.pathname + '?country=' + document.getElementById('country').value" class="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all btn-press">Get Another Address</button>
              [span_34](start_span)<button onclick="saveAddress()" class="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition-all btn-press">Save Address</button>[span_34](end_span)
            </div>
          </div>

          <div class="bg-white p-6 rounded-2xl shadow-lg fade-in" style="animation-delay: 0.1s;">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Saved Addresses</h2>
            <div id="savedAddressesContainer" class="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              [span_35](start_span)</div>[span_35](end_span)
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
            [span_36](start_span)const toast = document.getElementById('copied-toast');[span_36](end_span)
            [span_37](start_span)toast.style.transform = 'translateY(0)';[span_37](end_span)
            setTimeout(() => {
              toast.style.transform = 'translateY(-5rem)';
            [span_38](start_span)}, 2000);[span_38](end_span)
            if(button) {
                [span_39](start_span)const originalIcon = button.innerHTML;[span_39](end_span)
              [span_40](start_span)button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';[span_40](end_span)
              setTimeout(() => {
                    button.innerHTML = originalIcon;
                [span_41](start_span)}, 1500);[span_41](end_span)
            }
          }).catch(err => {
            console.error('Could not copy text: ', err);
          [span_42](start_span)});[span_42](end_span)
        }

        // 更改国家功能
        function changeCountry(country) {
          [span_43](start_span)window.location.href = window.location.pathname + '?country=' + country;[span_43](end_span)
        }

        // 保存地址功能
        function saveAddress() {
          [span_44](start_span)const note = prompt('Please enter a note (optional)', '');[span_44](end_span)
          // 使用 try-catch 保证即使 localStorage 有问题，页面也不会崩溃
          try {
            [span_45](start_span)const savedAddresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');[span_45](end_span)
            const newEntry = {
              note: note || [span_46](start_span)'No notes',[span_46](end_span)
              [span_47](start_span)name: document.getElementById('info-name').textContent,[span_47](end_span)
              [span_48](start_span)gender: document.getElementById('info-gender').textContent,[span_48](end_span)
              [span_49](start_span)phone: document.getElementById('info-phone').textContent,[span_49](end_span)
              [span_50](start_span)address: document.getElementById('info-address').textContent[span_50](end_span)
            };
            [span_51](start_span)savedAddresses.unshift(newEntry);[span_51](end_span)
            [span_52](start_span)localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));[span_52](end_span)
            [span_53](start_span)renderSavedAddresses();[span_53](end_span)
          } catch (e) {
            [span_54](start_span)console.error("Could not save address to localStorage", e);[span_54](end_span)
            [span_55](start_span)alert("Error: Could not save address. Your browser might be blocking localStorage.");[span_55](end_span)
          }
        }
        
        // 渲染保存的地址
        function renderSavedAddresses() {
          try {
            [span_56](start_span)const savedAddresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');[span_56](end_span)
            [span_57](start_span)const container = document.getElementById('savedAddressesContainer');[span_57](end_span)
            [span_58](start_span)container.innerHTML = '';[span_58](end_span)
            
            if (savedAddresses.length === 0) {
                [span_59](start_span)container.innerHTML = '<p class="text-center text-gray-400 mt-10">No saved addresses yet.</p>';[span_59](end_span)
                [span_60](start_span)return;[span_60](end_span)
            }

            savedAddresses.forEach((entry, index) => {
              const card = document.createElement('div');
              card.className = 'p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-300';
              card.innerHTML = \`
                <div class="flex justify-between items-start">
                  [span_61](start_span)<p class="font-bold text-gray-700">\${entry.note.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>[span_61](end_span)
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
              [span_62](start_span)container.appendChild(card);[span_62](end_span)
            });
          } catch (e) {
            [span_63](start_span)console.error("Could not render saved addresses from localStorage", e);[span_63](end_span)
          }
        }

        // 删除地址功能
        function deleteAddress(index) {
            try {
              [span_64](start_span)const savedAddresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');[span_64](end_span)
              [span_65](start_span)savedAddresses.splice(index, 1);[span_65](end_span)
              [span_66](start_span)localStorage.setItem('savedAddresses', JSON.stringify(savedAddresses));[span_66](end_span)
              [span_67](start_span)renderSavedAddresses();[span_67](end_span)
            } catch(e) {
              [span_68](start_span)console.error("Could not delete address from localStorage", e);[span_68](end_span)
            }
        }

        // 页面加载时渲染
        window.onload = function() {
          [span_69](start_span)renderSavedAddresses();[span_69](end_span)
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
    [span_70](start_span)console.error('Vercel Function failed:', error);[span_70](end_span)
    // 返回一个友好的错误页面
    return new Response(`
      <div style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h1>Oops! Something went wrong.</h1>
        <p>We couldn't generate an address right now. Please try refreshing the page.</p>
        <p style="color: grey; font-size: 0.8em;">Error: ${error.message}</p>
      </div>
    `, {
      status: 500,
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    [span_71](start_span)});[span_71](end_span)
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
  [span_72](start_span)return { lat, lng }[span_72](end_span)
}

/**
 * 将从 API 获取的地址对象格式化为字符串
 * @param {object} address - Nominatim API 返回的地址对象
 * @param {string} country - 国家代码
 * @returns {string}
 */
function formatAddress(address, country) {
  [span_73](start_span)const city = address.city || address.town || address.village;[span_73](end_span)
  const postcode = address.postcode || [span_74](start_span)'';[span_74](end_span)
  // 拼接地址字符串
  [span_75](start_span)return `${address.house_number} ${address.road}, ${city}, ${postcode}, ${country}`;[span_75](end_span)
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
      [span_76](start_span)return `+61 4 ${number.slice(0,4)} ${number.slice(4)}`;[span_76](end_span)
    },
    "CH": () => {
      [span_77](start_span)const prefix = ['75', '76', '77', '78', '79'][Math.floor(Math.random() * 5)];[span_77](end_span)
      [span_78](start_span)const number1 = Math.floor(100 + Math.random() * 900).toString();[span_78](end_span)
      [span_79](start_span)const number2 = Math.floor(10 + Math.random() * 90).toString();[span_79](end_span)
      [span_80](start_span)const number3 = Math.floor(10 + Math.random() * 90).toString();[span_80](end_span)
      [span_81](start_span)return `+41 ${prefix} ${number1} ${number2} ${number3}`;[span_81](end_span)
    }
  }
  [span_82](start_span)return phoneFormats[country] ? phoneFormats[country]() : 'Invalid country code';[span_82](end_span)
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
