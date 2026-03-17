# Ordu Servis Uygulaması (MVP)

Bu demo Ordu için iki ayrı sayfadan oluşur:

- `index.html`: Talep formu + servisçi girişi + müşteri teklif seçimi
- `admin.html`: Sadece admin işlemleri (onay/red, eşleştirme, teklif gönderme, servisçiye bildirim, arşiv, ödeme, harita)

## Özellikler

- Talep formu + telefon doğrulama (demo OTP)
- Servisçi girişi + telefon doğrulama + servis ücreti alanı
- Admin paneli ayrı sayfa ve şifreli giriş (`B5252FLK`)
- İlçe/okul bazlı eşleştirme ve müşteriye teklif gönderme
- Müşterinin tekliflerden servis seçmesi
- Adminin seçilen öğrenciyi ilgili servisçiye bildirmesi
- Arşivleme, telefon ile arama, ödeme ve harita takip simülasyonları
- Sayfalar arası veri paylaşımı için `localStorage`

## Çalıştırma

```bash
python3 -m http.server 8000
```

- Müşteri/servisçi ekranı: `http://localhost:8000`
- Admin ekranı: `http://localhost:8000/admin.html`