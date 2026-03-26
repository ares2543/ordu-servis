const API_BASE = '';

const districtsToSchools = (() => {
  const map = {};
  const raw = (window.ORDU_SCHOOL_RAW || '').split('\n');

  for (const line of raw) {
    const match = line.trim().match(/^([A-ZÇĞİÖŞÜ]+)\s+(\d{5,6})\s+(.+)$/u);
    if (!match) continue;

    let district = match[1];
    if (district === 'AKKUL') district = 'AKKUŞ';

    const name = match[3].trim();
    const prettyDistrict = district
      .toLocaleLowerCase('tr-TR')
      .replace(/(^|\s)\S/g, char => char.toLocaleUpperCase('tr-TR'));

    if (!map[prettyDistrict]) map[prettyDistrict] = [];
    if (!map[prettyDistrict].includes(name)) map[prettyDistrict].push(name);
  }

  return map;
})();


const pageState = {
  otp: null,
  driverOtp: null,
  customerMap: null,
  customerMarker: null,
  pollTimer: null,
  driverWatchId: null
};

function setStatus(id, text, type = 'ok') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `status ${type}`;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function switchTab(targetId) {
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === targetId));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.id === targetId));
}

document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function populateDistrictSelect(selectId) {
  const select = document.getElementById(selectId);
  select.innerHTML = Object.keys(districtsToSchools).map(d => `<option value="${d}">${d}</option>`).join('');
}

function populateSchools(district) {
  const schoolOptions = document.getElementById('schoolOptions');
  const schoolInput = document.getElementById('schoolInput');
  const schools = districtsToSchools[district] || [];
  schoolOptions.innerHTML = schools.map(s => `<option value="${s}">${s}</option>`).join('');
  if (schools.length) schoolInput.value = schools[0];
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'İstek başarısız' }));
    throw new Error(err.message || 'İstek başarısız');
  }
  return response.json();
}

function initCustomerMap() {
  if (pageState.customerMap) return;
  pageState.customerMap = L.map('customerMap').setView([40.98, 37.88], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(pageState.customerMap);
}

async function pollServiceLocation() {
  try {
    const data = await api('/location');
    initCustomerMap();
    const latlng = [data.lat, data.lng];
    if (!pageState.customerMarker) {
      pageState.customerMarker = L.marker(latlng).addTo(pageState.customerMap);
      pageState.customerMarker.bindPopup('Servis canlı konumu');
    } else {
      pageState.customerMarker.setLatLng(latlng);
    }
    pageState.customerMap.setView(latlng, 14);
    setStatus('trackingInfo', `Canlı konum güncellendi: ${new Date(data.updatedAt).toLocaleTimeString('tr-TR')}`, 'ok');
  } catch (error) {
    setStatus('trackingInfo', error.message, 'warn');
  }
}

function startCustomerTracking() {
  if (pageState.pollTimer) clearInterval(pageState.pollTimer);
  pollServiceLocation();
  pageState.pollTimer = setInterval(pollServiceLocation, 3000);
  setStatus('trackingInfo', 'Canlı takip başladı. Konum her 3 saniyede yenileniyor.', 'ok');
}

function startDriverLiveLocation() {
  if (!navigator.geolocation) {
    setStatus('driverStatus', 'Tarayıcı konum API desteklemiyor.', 'warn');
    return;
  }

  if (pageState.driverWatchId) navigator.geolocation.clearWatch(pageState.driverWatchId);

  pageState.driverWatchId = navigator.geolocation.watchPosition(
    async position => {
      try {
        await api('/location', {
          method: 'POST',
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        });
        setStatus('driverStatus', 'Canlı konum sunucuya gönderildi.', 'ok');
      } catch (error) {
        setStatus('driverStatus', `Konum gönderimi başarısız: ${error.message}`, 'warn');
      }
    },
    error => {
      setStatus('driverStatus', `Konum alınamadı: ${error.message}`, 'warn');
    },
    { enableHighAccuracy: true, maximumAge: 2000 }
  );
}

populateDistrictSelect('districtSelect');
populateDistrictSelect('driverDistrictSelect');
populateSchools(document.getElementById('districtSelect').value);

document.getElementById('districtSelect').addEventListener('change', e => {
  populateSchools(e.target.value);
});

document.getElementById('sendOtpBtn').addEventListener('click', () => {
  pageState.otp = generateOtp();
  setStatus('requestStatus', `SMS doğrulama kodu gönderildi (demo): ${pageState.otp}`, 'ok');
});

document.getElementById('sendDriverOtpBtn').addEventListener('click', () => {
  pageState.driverOtp = generateOtp();
  setStatus('driverStatus', `Servisçi doğrulama kodu gönderildi (demo): ${pageState.driverOtp}`, 'ok');
});

document.getElementById('requestForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);

  if (!pageState.otp || formData.get('otp') !== pageState.otp) {
    setStatus('requestStatus', 'Telefon doğrulama kodu hatalı.', 'warn');
    return;
  }

  try {
    const request = await api('/requests', {
      method: 'POST',
      body: JSON.stringify({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        district: formData.get('district'),
        school: formData.get('school'),
        homeAddress: formData.get('homeAddress'),
        fromAddress: formData.get('fromAddress'),
        toAddress: formData.get('toAddress')
      })
    });

    setStatus('requestStatus', `Talebiniz alındı. Talep numarası: ${request.id}`, 'ok');
    e.target.reset();
  } catch (error) {
    setStatus('requestStatus', error.message, 'warn');
  }
});

document.getElementById('driverForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);

  if (!pageState.driverOtp || formData.get('otp') !== pageState.driverOtp) {
    setStatus('driverStatus', 'Servisçi telefon doğrulama kodu hatalı.', 'warn');
    return;
  }

  try {
    const driver = await api('/drivers', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        phone: formData.get('phone'),
        plate: formData.get('plate'),
        district: formData.get('district'),
        schoolCoverage: formData.get('schoolCoverage'),
        fee: Number(formData.get('fee'))
      })
    });

    setStatus('driverStatus', `Servisçi kaydı alındı: ${driver.name} (₺${driver.fee.toFixed(2)})`, 'ok');
    e.target.reset();
  } catch (error) {
    setStatus('driverStatus', error.message, 'warn');
  }
});

window.selectOffer = async function selectOffer(requestId, driverId) {
  try {
    await api('/offers/select', {
      method: 'POST',
      body: JSON.stringify({ requestId, driverId })
    });
    setStatus('offersStatus', `${requestId} için servis seçiminiz alındı. Admin sayfasına iletildi.`, 'ok');
    renderOffers();
  } catch (error) {
    setStatus('offersStatus', error.message, 'warn');
  }
};

async function renderOffers() {
  const form = document.getElementById('offersLookupForm');
  const requestId = form.elements.requestId.value.trim();
  const phone = form.elements.phone.value.trim();
  const offersContainer = document.getElementById('offersList');

  if (!requestId || !phone) return;

  try {
    const data = await api(`/offers?requestId=${encodeURIComponent(requestId)}&phone=${encodeURIComponent(phone)}`);
    const drivers = data.drivers || [];

    if (!drivers.length) {
      offersContainer.innerHTML = '';
      setStatus('offersStatus', 'Henüz size gönderilmiş servis teklifi yok.', 'warn');
      return;
    }

    offersContainer.innerHTML = drivers.map(driver => `
      <div class="card">
        <b>${driver.name}</b> | ${driver.plate}<br/>
        İlçe: ${driver.district}<br/>
        Hat: ${driver.schoolCoverage}<br/>
        Ücret: ₺${Number(driver.fee).toFixed(2)}
        <div class="row">
          <button onclick="selectOffer('${requestId}', '${driver.id}')">Bu Servisi Seç</button>
        </div>
      </div>
    `).join('');

    setStatus('offersStatus', `${drivers.length} servis seçeneği bulundu.`, 'ok');
  } catch (error) {
    offersContainer.innerHTML = '';
    setStatus('offersStatus', error.message, 'warn');
  }
}

document.getElementById('offersLookupForm').addEventListener('submit', e => {
  e.preventDefault();
  renderOffers();
});

document.getElementById('startTrackingBtn').addEventListener('click', startCustomerTracking);
document.getElementById('advanceTrackingBtn').addEventListener('click', pollServiceLocation);
document.getElementById('startDriverLiveBtn').addEventListener('click', startDriverLiveLocation);

