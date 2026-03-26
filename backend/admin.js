const ADMIN_PASSWORD = 'B5252FLK';
const API_BASE = '';

const state = {
  map: null,
  stopMarkers: [],
  currentStopIndex: 0
};

const sampleStops = [
  { name: 'Öğrenci 1 - Altınordu Durak', lat: 40.9835, lng: 37.8764 },
  { name: 'Öğrenci 2 - Ulubey Durak', lat: 40.8698, lng: 37.7541 },
  { name: 'Öğrenci 3 - Kabadüz Durak', lat: 40.8601, lng: 37.8848 }
];

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

function setStatus(id, text, type = 'ok') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `status ${type}`;
}

async function renderPendingRequests(data) {
  const container = document.getElementById('pendingRequests');
  if (!data.requests.length) {
    container.innerHTML = '<p>Bekleyen talep yok.</p>';
    return;
  }

  container.innerHTML = data.requests.map(req => `
    <div class="card">
      <b>${req.id}</b> - ${req.firstName} ${req.lastName}<br/>
      Telefon: ${req.phone} | ${req.district} / ${req.school}<br/>
      Güzergah: ${req.fromAddress} → ${req.toAddress}<br/>
      Durum: ${req.status}
      <div class="row">
        <button onclick="approveRequest('${req.id}')">Onayla</button>
        <button onclick="rejectRequest('${req.id}')">Reddet</button>
        <button onclick="sendMatchingOffers('${req.id}')">Uygun Servisleri Müşteriye Gönder</button>
      </div>
    </div>
  `).join('');
}

function renderMatchingBoard(data) {
  const container = document.getElementById('matchingBoard');
  if (!data.requests.length) {
    container.innerHTML = '<p>Eşleşme bekleyen talep yok.</p>';
    return;
  }

  container.innerHTML = data.requests.map(req => {
    const matched = data.drivers.filter(d => d.district === req.district);
    const options = matched.length
      ? matched.map(d => `<li>${d.name} | ${d.plate} | Ücret: ₺${Number(d.fee).toFixed(2)} | ${d.schoolCoverage}</li>`).join('')
      : '<li>Bu ilçe için uygun servis bulunamadı.</li>';
    return `<div class="card"><b>${req.id}</b> - ${req.district} / ${req.school}<ul>${options}</ul></div>`;
  }).join('');
}

function renderSelectedAssignments(data) {
  const container = document.getElementById('selectedAssignments');
  const selected = data.requests.filter(r => r.selectedDriverId && !r.driverNotified);
  if (!selected.length) {
    container.innerHTML = '<p>Müşteri seçimi sonrası bildirilecek kayıt yok.</p>';
    return;
  }

  container.innerHTML = selected.map(req => {
    const driver = data.drivers.find(d => d.id === req.selectedDriverId);
    return `
      <div class="card">
        <b>${req.id}</b> - ${req.firstName} ${req.lastName}<br/>
        Seçilen servis: ${driver ? `${driver.name} (${driver.plate}) - ₺${Number(driver.fee).toFixed(2)}` : 'Bulunamadı'}
        <div class="row"><button onclick="notifyDriverForRequest('${req.id}')">Öğrenciyi Servisçiye Bildir</button></div>
      </div>
    `;
  }).join('');
}

function renderArchive(data) {
  const search = document.getElementById('archiveSearch').value.trim();
  const filtered = data.archive.filter(item => !search || item.phone.includes(search));
  const container = document.getElementById('archiveRequests');

  container.innerHTML = filtered.length
    ? filtered.map(item => `<div class="card"><b>${item.id}</b> - ${item.firstName} ${item.lastName} | ${item.phone} | Durum: ${item.status}</div>`).join('')
    : '<p>Arşiv kaydı bulunamadı.</p>';
}

function renderDrivers(data) {
  const container = document.getElementById('driversList');
  container.innerHTML = data.drivers.length
    ? data.drivers.map(d => `<div class="card"><b>${d.name}</b> | ${d.phone} | ${d.plate} | İlçe: ${d.district} | Ücret: ₺${Number(d.fee).toFixed(2)} | ${d.schoolCoverage}</div>`).join('')
    : '<p>Kayıtlı servisçi yok.</p>';
}

async function renderAll() {
  const data = await api('/admin/state');
  await renderPendingRequests(data);
  renderMatchingBoard(data);
  renderSelectedAssignments(data);
  renderArchive(data);
  renderDrivers(data);
}

window.approveRequest = async function approveRequest(id) {
  try {
    await api(`/admin/requests/${id}/approve`, { method: 'POST' });
    await renderAll();
  } catch (error) {
    setStatus('adminLoginStatus', error.message, 'warn');
  }
};

window.rejectRequest = async function rejectRequest(id) {
  try {
    await api(`/admin/requests/${id}/reject`, { method: 'POST' });
    await renderAll();
  } catch (error) {
    setStatus('adminLoginStatus', error.message, 'warn');
  }
};

window.sendMatchingOffers = async function sendMatchingOffers(id) {
  try {
    const result = await api(`/admin/requests/${id}/send-offers`, { method: 'POST' });
    setStatus('adminLoginStatus', `${id} için ${result.count} servis seçeneği müşteriye gönderildi.`, 'ok');
    await renderAll();
  } catch (error) {
    setStatus('adminLoginStatus', error.message, 'warn');
  }
};

window.notifyDriverForRequest = async function notifyDriverForRequest(id) {
  try {
    const result = await api(`/admin/requests/${id}/notify-driver`, { method: 'POST' });
    setStatus('trackingStatus', `${result.requestId} talebi ${result.driverName || 'servisçiye'} bildirildi.`, 'ok');
    await renderAll();
  } catch (error) {
    setStatus('trackingStatus', error.message, 'warn');
  }
};

function initMap() {
  if (state.map) return;
  state.map = L.map('map').setView([40.98, 37.88], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);

  sampleStops.forEach(stop => {
    const marker = L.marker([stop.lat, stop.lng]).addTo(state.map);
    marker.bindPopup(`${stop.name} - Bekleniyor`);
    state.stopMarkers.push(marker);
  });
}

document.getElementById('adminLoginBtn').addEventListener('click', async () => {
  const input = document.getElementById('adminPassword').value;
  if (input !== ADMIN_PASSWORD) {
    setStatus('adminLoginStatus', 'Şifre yanlış.', 'warn');
    return;
  }
  document.getElementById('adminContent').classList.remove('hidden');
  setStatus('adminLoginStatus', 'Admin girişi başarılı.', 'ok');
  initMap();
  await renderAll();
});

document.getElementById('archiveSearch').addEventListener('input', () => {
  renderAll();
});

document.getElementById('paymentForm').addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const requestId = formData.get('requestId');
  const amount = Number(formData.get('amount'));
  const adminCut = amount * 0.15;
  const driverPayment = amount - adminCut;
  setStatus('paymentStatus', `${requestId} için ödeme alındı. Admin payı: ₺${adminCut.toFixed(2)}, Servisçiye aktarım: ₺${driverPayment.toFixed(2)}.`, 'ok');
  e.target.reset();
});

document.getElementById('simulateApproachBtn').addEventListener('click', () => {
  setStatus('trackingStatus', 'Bildirim gönderildi: Servisiniz 10 dakika içinde durağınızda olacak.', 'ok');
});

document.getElementById('pickupNextBtn').addEventListener('click', () => {
  if (!state.map) return;
  if (state.currentStopIndex >= state.stopMarkers.length) {
    setStatus('trackingStatus', 'Tüm öğrenciler alındı.', 'ok');
    return;
  }

  const marker = state.stopMarkers[state.currentStopIndex];
  marker.setIcon(L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  }));

  marker.bindPopup(`${sampleStops[state.currentStopIndex].name} - Alındı`).openPopup();
  state.currentStopIndex += 1;
  setStatus('trackingStatus', `${sampleStops[state.currentStopIndex - 1].name} alındı olarak işlendi.`, 'ok');
});