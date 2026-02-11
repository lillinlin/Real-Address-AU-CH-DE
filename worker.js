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

    for (let i = 0; i < 100; i++) {
      const location = getRandomLocationInCountry(country);
      const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`;

      try {
        const response = await safeFetch(apiUrl, {
          headers: { 'User-Agent': 'CF Worker Address Generator' }
        });
        const data = await response.json();

        if (
          data?.address?.house_number &&
          data?.address?.road &&
          (data.address.city || data.address.town || data.address.village)
        ) {
          address = formatAddress(data.address, country);
          break;
        }
      } catch {}
    }

    if (!address) address = `1 Default Street, Default City, 00000, ${country}`;

    const { name: genName, gender: genGender } = generateName(country);
    name = genName;
    gender = genGender;

    phone = getRandomPhoneNumber(country);

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
    ${renderField('Address', address)}

    <iframe class="w-full h-64 rounded-lg mt-4"
      src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed"></iframe>
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
    "AT": [{ lat: 48.2082, lng: 16.3738 }],   // Vienna
    "BR": [{ lat: -15.7939, lng: -47.8828 }], // Brasília
    "KZ": [
      { lat: 51.1605, lng: 71.4704 },
      { lat: 43.2383, lng: 76.9458 },
      { lat: 50.2839, lng: 57.1660 }
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
    "DE": () => `+49 15${Math.floor(Math.random()*9)} ${Math.floor(1000000+Math.random()*9000000)}`,
    "AT": () => `+43 6${Math.floor(Math.random()*9)} ${Math.floor(1000000+Math.random()*9000000)}`,
    "BR": () => {
      const ddd = ["11","21","31","41","51","61","71","81"][Math.floor(Math.random()*8)];
      return `+55 ${ddd} 9${Math.floor(10000000 + Math.random()*90000000)}`;
    }
  };
  return formats[country] ? formats[country]() : formats["AU"]();
}

// =================== 姓名库 ===================

function generateName(country) {

  if (country === "AT") {
    const male = ["Lukas","Jonas","Felix","Maximilian","David","Paul"];
    const female = ["Anna","Emma","Sophie","Laura","Hannah","Lena"];
    const last = ["Gruber","Huber","Wagner","Mayer","Pichler","Berger"];
    const isMale = Math.random() < 0.5;
    const first = isMale ? male[Math.floor(Math.random()*male.length)]
                         : female[Math.floor(Math.random()*female.length)];
    return { name: `${first} ${last[Math.floor(Math.random()*last.length)]}`, gender: isMale ? "Male" : "Female" };
  }

  if (country === "BR") {
    const male = ["João","Gabriel","Lucas","Matheus","Pedro","Rafael"];
    const female = ["Maria","Ana","Julia","Beatriz","Larissa","Camila"];
    const last = ["Silva","Santos","Oliveira","Souza","Lima","Costa"];
    const isMale = Math.random() < 0.5;
    const first = isMale ? male[Math.floor(Math.random()*male.length)]
                         : female[Math.floor(Math.random()*female.length)];
    return { name: `${first} ${last[Math.floor(Math.random()*last.length)]}`, gender: isMale ? "Male" : "Female" };
  }

  if (country === "KZ") {
    const male = ["Aidos","Nursultan","Alikhan","Yernar","Askar"];
    const female = ["Aigerim","Dana","Madina","Aruzhan"];
    const last = ["Mukhamedov","Sarsembayev","Tulegenov"];
    const isMale = Math.random() < 0.5;
    const first = isMale ? male[Math.floor(Math.random()*male.length)]
                         : female[Math.floor(Math.random()*female.length)];
    return { name: `${first} ${last[Math.floor(Math.random()*last.length)]}`, gender: isMale ? "Male" : "Female" };
  }

  return { name: "Alex Smith", gender: "Unknown" };
}

// =================== UI ===================

function getCountryOptions(c) {
  const list = [
    { name: "Australia", code: "AU" },
    { name: "Switzerland", code: "CH" },
    { name: "Germany", code: "DE" },
    { name: "Austria", code: "AT" },
    { name: "Brazil", code: "BR" },
    { name: "Kazakhstan", code: "KZ" }
  ];
  return list.map(x => `<option value="${x.code}" ${c===x.code?'selected':''}>${x.name}</option>`).join('');
}

function renderField(label, value) {
  return `
    <div class="mb-3">
      <div class="flex justify-between">
        <span class="text-gray-600">${label}</span>
        <button onclick="copyToClipboard('${value}')" class="text-blue-600 text-sm">Copy</button>
      </div>
      <div class="p-2 border rounded bg-gray-50">${value}</div>
    </div>`;
}
