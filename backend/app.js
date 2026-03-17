const STORAGE_KEY = 'orduServiceState';

const districtsToSchools = {
  Altınordu: ['Atatürk Anadolu Lisesi', 'Durugöl Ortaokulu', 'Cumhuriyet İlkokulu'],
  Ulubey: ['Ulubey Anadolu İmam Hatip Lisesi', 'Ulubey Ortaokulu'],
  Kabadüz: ['Kabadüz Çok Programlı Anadolu Lisesi', 'Kabadüz Ortaokulu'],
  Fatsa: ['Fatsa Fen Lisesi', 'Fatsa Mehmet Akif Ersoy Ortaokulu'],
  Ünye: ['Ünye Anadolu Lisesi', 'Ünye Atatürk Ortaokulu'],
  Perşembe: ['Perşembe Anadolu Lisesi'],
  Gülyalı: ['Gülyalı Çok Programlı Anadolu Lisesi'],
  Gölköy: ['Gölköy Anadolu Lisesi']
};

const pageState = { otp: null, driverOtp: null };

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { requests: [], drivers: [], archive: [], sentOffers: {} };
  try {
    return JSON.parse(raw);
  } catch {
    return { requests: [], drivers: [], archive: [], sentOffers: {} };
  }
}

function saveState(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

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
  const schoolSelect = document.getElementById('schoolSelect');
  schoolSelect.innerHTML = (districtsToSchools[district] || []).map(s => `<option value="${s}">${s}</option>`).join('');
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

document.getElementById('requestForm').addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(e.target);

  if (!pageState.otp || formData.get('otp') !== pageState.otp) {
    setStatus('requestStatus', 'Telefon doğrulama kodu hatalı.', 'warn');
    return;
  }

  const state = loadState();
  const request = {
    id: `T-${Date.now()}`,
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    phone: formData.get('phone'),
    district: formData.get('district'),
    school: formData.get('school'),
    homeAddress: formData.get('homeAddress'),
    fromAddress: formData.get('fromAddress'),
    toAddress: formData.get('toAddress'),
    status: 'Beklemede',
    selectedDriverId: null,
    driverNotified: false
  };

  state.requests.push(request);
  saveState(state);
  setStatus('requestStatus', `Talebiniz alındı. Talep numarası: ${request.id}`, 'ok');
  e.target.reset();
});

document.getElementById('driverForm').addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(e.target);

  if (!pageState.driverOtp || formData.get('otp') !== pageState.driverOtp) {
    setStatus('driverStatus', 'Servisçi telefon doğrulama kodu hatalı.', 'warn');
    return;
  }

  const state = loadState();
  const driver = {
    id: `S-${Date.now()}`,
    name: formData.get('name'),
    phone: formData.get('phone'),
    plate: formData.get('plate'),
    district: formData.get('district'),
    schoolCoverage: formData.get('schoolCoverage'),
    fee: Number(formData.get('fee'))
  };

  state.drivers.push(driver);
  saveState(state);
  setStatus('driverStatus', `Servisçi kaydı alındı: ${driver.name} (₺${driver.fee.toFixed(2)})`, 'ok');
  e.target.reset();
});

function getOfferDrivers(state, requestId) {
  const driverIds = state.sentOffers[requestId] || [];
  return state.drivers.filter(d => driverIds.includes(d.id));
}

window.selectOffer = function selectOffer(requestId, driverId) {
  const state = loadState();
  const request = state.requests.find(r => r.id === requestId);
  if (!request) return;

  request.selectedDriverId = driverId;
  request.status = 'Müşteri servis seçimini yaptı';
  saveState(state);
  setStatus('offersStatus', `${requestId} için servis seçiminiz alındı. Admin sayfasına iletildi.`, 'ok');
  renderOffers();
};

function renderOffers() {
  const form = document.getElementById('offersLookupForm');
  const requestId = form.elements.requestId.value.trim();
  const phone = form.elements.phone.value.trim();
  const offersContainer = document.getElementById('offersList');

  if (!requestId || !phone) return;

  const state = loadState();
  const request = state.requests.find(r => r.id === requestId) || state.archive.find(r => r.id === requestId);

  if (!request || request.phone !== phone) {
    offersContainer.innerHTML = '';
    setStatus('offersStatus', 'Talep bulunamadı veya telefon doğrulanamadı.', 'warn');
    return;
  }

  const drivers = getOfferDrivers(state, requestId);
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
}

document.getElementById('offersLookupForm').addEventListener('submit', e => {
  e.preventDefault();
  renderOffers();
});