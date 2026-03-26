# Ordu Servis Uygulaması (MVP)

Bu proje **Node.js + Express backend** ve statik frontend ile tek sunucuda çalışır.

## Hızlı Başlangıç

```bash
npm install
npm start
```

- Uygulama: `http://localhost:3000`
- Admin: `http://localhost:3000/admin.html`
- Health: `http://localhost:3000/health`

## Sayfalar

- `index.html`: Talep formu + servisçi girişi + müşteri teklif seçimi + canlı takip
- `admin.html`: Admin işlemleri (onay/red, eşleştirme, teklif gönderme, servisçiye bildirim, arşiv, ödeme, harita)

## Konum API

- `GET /location` → mevcut servis konumu
- `POST /location` → servis konumu güncelle

## Diğer API'ler

- `POST /requests` / `GET /requests`
- `POST /drivers` / `GET /drivers`
- `GET /offers?requestId=...&phone=...`
- `POST /offers/select`
- `GET /admin/state`
- `POST /admin/requests/:id/approve`
- `POST /admin/requests/:id/reject`
- `POST /admin/requests/:id/send-offers`
- `POST /admin/requests/:id/notify-driver`

## Render Deploy

Repo kökünde `render.yaml` hazırdır. Render'da repo bağlayıp deploy edebilirsin.


## Okul Listesi

- Tüm Ordu ilçeleri için ilkokul/ortaokul/lise okul önerileri forma eklendi.
- Okul alanı datalist desteklidir; listede yoksa okul adı manuel yazılabilir.