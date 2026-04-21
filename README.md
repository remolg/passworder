# Passworder

Passworder, tamamen lokal çalışan, offline-first bir Electron masaüstü şifre yöneticisidir. Tüm kayıtlar yalnızca kullanıcının cihazında tutulur; sunucu, telemetri, bulut senkronizasyonu ve uzaktaki veri saklama yoktur.

## Kısa ürün tanımı

- İlk açılışta kullanıcı master password oluşturur.
- Master password ile `scrypt` üzerinden kasa anahtarı türetilir.
- Kasa verisi `AES-256-GCM` ile şifrelenmiş lokal JSON dosyasında tutulur.
- Uygulama `Electron + React + TypeScript + shadcn/ui` ile geliştirilmiştir.
- Ana ekranda `Hızlı Şifre Ekle`, `Şifrelerim`, arama, şifre üretici ve kasa ayarları bulunur.

## Teknoloji seçimi ve gerekçesi

### Neden Electron + React + TypeScript + shadcn/ui?

- `Electron`: Rust/toolchain zorunluluğu olmadan doğrudan masaüstü uygulaması üretir.
- `React + TypeScript`: UI akışlarını modüler ve sürdürülebilir şekilde kurmak için uygun.
- `shadcn/ui`: sade, profesyonel ve kontrollü bir masaüstü görünümü sağlar.
- `Node.js crypto`: ek native kripto bağımlılığı kurmadan `scrypt + AES-256-GCM` kullanmayı mümkün kılar.

## Saklama yaklaşımı

İlk sürüm için `şifrelenmiş JSON dosyası` seçildi.

### Neden SQLite yerine şifrelenmiş JSON?

- Tek kullanıcı ve ilk sürüm için daha basit.
- Bakımı ve dağıtımı daha kolay.
- Tüm kasayı tek şifreli blob olarak tutmak mimariyi sadeleştirir.
- Desktop uygulamada ilk sürüm için yeterli güvenlik ve operasyonel sadelik sağlar.

## UI yerleşimi

- Sol panel:
  - `Hızlı Şifre Ekle`
  - `Şifre Üretici`
  - `Kasa Ayarları`
- Sağ panel:
  - `Şifrelerim`
  - üstte arama alanı
  - her kayıt için göster/gizle, kopyala, düzenle, sil

Pencere küçük ve düzenli masaüstü kullanımına göre ayarlanmıştır:

- Başlangıç boyutu: `1180x820`
- Minimum boyut: `1000x720`

## Mimari tasarım

### Ön yüz

- `src/App.tsx`: ana ekran kompozisyonu
- `src/hooks/use-vault-controller.ts`: Electron IPC üzerinden kasa işlemleri
- `src/hooks/use-auto-lock.ts`: kullanıcı etkinliğine göre otomatik kilit
- `src/components/*`: form, liste, diyalog ve ayar panelleri

### Masaüstü / kasa katmanı

- `electron/main.cjs`: pencere oluşturma ve IPC handler kayıtları
- `electron/preload.cjs`: güvenli `contextBridge` API yüzeyi
- `electron/vault-service.cjs`: lokal kasa, kripto, oturum ve pano yönetimi
- `electron/dev-runner.cjs`: geliştirme sırasında masaüstü penceresini başlatma

## Güvenlik modeli

- KDF: `scrypt`
- Şifreleme: `AES-256-GCM`
- Salt: kriptografik olarak güçlü rastgele salt
- Nonce: her şifreleme işleminde ayrı nonce
- Master password düz metin olarak diskte tutulmaz
- Hassas veri console log'a yazdırılmaz
- Kasa kilitliyken veri sadece şifreli dosyadadır
- Kasa açıldığında veri ve oturum anahtarı yalnızca uygulama belleğinde tutulur
- Belirli süre işlem yoksa kasa otomatik kilitlenir
- Pano kopyaları belirli süre sonra temizlenmeye çalışılır

## Veri modeli

### Şifreli kasa dosyası

```json
{
  "version": 1,
  "kdf": {
    "algorithm": "scrypt",
    "cost": 32768,
    "blockSize": 8,
    "parallelization": 1,
    "keyLength": 32,
    "saltB64": "..."
  },
  "cipher": "aes-256-gcm",
  "verification": {
    "nonceB64": "...",
    "ciphertextB64": "...",
    "authTagB64": "..."
  },
  "vault": {
    "nonceB64": "...",
    "ciphertextB64": "...",
    "authTagB64": "..."
  },
  "updatedAt": "..."
}
```

### Çözülmüş kasa içeriği

```json
{
  "entries": [
    {
      "id": "uuid",
      "service": "GitHub",
      "username": "user@example.com",
      "password": "secret",
      "url": "https://github.com",
      "notes": "2FA aktif",
      "tags": ["iş", "geliştirme"],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "settings": {
    "autoLockMinutes": 5,
    "clipboardClearSeconds": 30
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Klasör yapısı

```text
passworder/
├─ electron/
│  ├─ dev-runner.cjs
│  ├─ main.cjs
│  ├─ preload.cjs
│  └─ vault-service.cjs
├─ src/
│  ├─ components/
│  ├─ hooks/
│  ├─ lib/
│  ├─ types/
│  ├─ App.tsx
│  └─ main.tsx
├─ package.json
└─ README.md
```

## Adım adım geliştirme planı

1. Electron + React + TypeScript iskeletini kur.
2. shadcn/ui tabanlı sade masaüstü arayüzünü yerleştir.
3. Master password oluşturma ve kasa açma akışını bağla.
4. Lokal şifreli JSON kasa modelini uygula.
5. `scrypt + AES-256-GCM` kripto katmanını Node tarafında kur.
6. Kayıt ekleme, düzenleme, silme, listeleme ve arama akışlarını bağla.
7. Şifre üretici, pano temizleme ve otomatik kilidi ekle.
8. Windows paketleme ayarlarını tamamla.

## Kurulum ve çalıştırma

### Gereksinimler

- Node.js 20+
- npm 10+

### Geliştirme

```bash
npm install
npm run dev
```

Bu komut browser tab açmaz; `Electron` masaüstü penceresi açar.

### Sadece renderer derlemesi

```bash
npm run build
```

## Paketleme

Windows için:

```bash
npm run package:win
```

Çıktılar `release/` klasörüne yazılır.

## Çalışma durumu

Bu depodaki renderer tarafı `npm run build` ile doğrulanmıştır.

Electron çalıştırma ve paketleme için gerekli npm bağımlılıklarının kurulması gerekir:

- `electron`
- `electron-builder`
- `concurrently`
- `wait-on`

## İleride eklenebilecek özellikler

- Favori kayıtlar
- Çoklu kasa profili
- İçe aktar / dışa aktar
- Kategori bazlı filtreler
- Şifre gücü analizi
- Sistem tepsisine küçültme
- Donanımsal güvenlik anahtarı desteği
- Otomatik doldurma entegrasyonu

## Güvenlik sınırları

- Kasa açıkken veriler RAM içinde çözümlenmiş halde bulunur.
- Pano temizliği denense de işletim sistemi panosu geçmişte tutabilir.
- Ekran görüntüsü, keylogger veya zararlı yazılımlara karşı bu uygulama tek başına yeterli değildir.
- Master password zayıf seçilirse tüm güvenlik modeli zayıflar.
- Cihaz ele geçirilmiş ve oturum açık ise veriler erişilebilir olabilir.
