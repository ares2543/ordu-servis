const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

let servisKonum = { lat: 41.0, lng: 37.9 };

const state = {
  requests: [],
  drivers: [],
  archive: [],
  sentOffers: {}
};

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'ordu-servis', time: new Date().toISOString() });
});

app.get('/location', (req, res) => {
  res.json(servisKonum);
});

app.post('/location', (req, res) => {
  servisKonum = req.body;
  res.json({ message: 'konum güncellendi' });
});

app.get('/requests', (req, res) => {
  res.json(state.requests);
});

app.post('/requests', (req, res) => {
  const request = {
    id: `T-${Date.now()}`,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    district: req.body.district,
    school: req.body.school,
    homeAddress: req.body.homeAddress,
    fromAddress: req.body.fromAddress,
    toAddress: req.body.toAddress,
    status: 'Beklemede',
    selectedDriverId: null,
    driverNotified: false
  };

  state.requests.push(request);
  res.status(201).json(request);
});

app.get('/drivers', (req, res) => {
  res.json(state.drivers);
});

app.post('/drivers', (req, res) => {
  const driver = {
    id: `S-${Date.now()}`,
    name: req.body.name,
    phone: req.body.phone,
    plate: req.body.plate,
    district: req.body.district,
    schoolCoverage: req.body.schoolCoverage,
    fee: Number(req.body.fee)
  };

  state.drivers.push(driver);
  res.status(201).json(driver);
});

app.get('/offers', (req, res) => {
  const { requestId, phone } = req.query;
  const request = state.requests.find(r => r.id === requestId) || state.archive.find(r => r.id === requestId);

  if (!request || request.phone !== phone) {
    return res.status(404).json({ message: 'Talep bulunamadı.' });
  }

  const driverIds = state.sentOffers[requestId] || [];
  const drivers = state.drivers.filter(d => driverIds.includes(d.id));
  return res.json({ request, drivers });
});

app.post('/offers/select', (req, res) => {
  const { requestId, driverId } = req.body;
  const request = state.requests.find(r => r.id === requestId);
  if (!request) return res.status(404).json({ message: 'Talep bulunamadı.' });

  request.selectedDriverId = driverId;
  request.status = 'Müşteri servis seçimini yaptı';
  return res.json({ ok: true, request });
});

app.get('/admin/state', (req, res) => {
  res.json(state);
});

app.post('/admin/requests/:id/approve', (req, res) => {
  const request = state.requests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ message: 'Talep bulunamadı.' });
  request.status = 'Onaylandı';
  return res.json({ ok: true, request });
});

app.post('/admin/requests/:id/reject', (req, res) => {
  const idx = state.requests.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'Talep bulunamadı.' });

  const request = state.requests[idx];
  request.status = 'Reddedildi';
  state.archive.push({ ...request });
  state.requests.splice(idx, 1);
  return res.json({ ok: true });
});

app.post('/admin/requests/:id/send-offers', (req, res) => {
  const request = state.requests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ message: 'Talep bulunamadı.' });

  const matchedDrivers = state.drivers.filter(d => d.district === request.district);
  if (!matchedDrivers.length) {
    return res.status(400).json({ message: `${request.district} için eşleşen servisçi yok.` });
  }

  state.sentOffers[request.id] = matchedDrivers.map(d => d.id);
  request.status = 'Teklifler müşteriye gönderildi';
  return res.json({ ok: true, count: matchedDrivers.length });
});

app.post('/admin/requests/:id/notify-driver', (req, res) => {
  const idx = state.requests.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ message: 'Talep bulunamadı.' });

  const request = state.requests[idx];
  const driver = state.drivers.find(d => d.id === request.selectedDriverId);
  request.driverNotified = true;
  request.status = `Servisçiye bildirildi (${driver ? driver.name : 'Bilinmiyor'})`;
  state.archive.push({ ...request });
  state.requests.splice(idx, 1);

  return res.json({ ok: true, driverName: driver ? driver.name : null, requestId: request.id });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server çalışıyor');
});