# Passworder

**Passworder**, gizlilik odaklı ve tamamen çevrimdışı çalışan modern bir masaüstü şifre yöneticisidir. Verileriniz buluta gönderilmez; yalnızca kendi cihazınızda, şifrelenmiş şekilde saklanır.

![Passworder ekran görüntüsü](src/assets/readme/3.png)

## İndir ve Kullan

Windows kullanıcıları uygulamayı GitHub **Releases** bölümünden indirebilir.

- **Kurulumlu sürüm:** `Passworder-Setup-0.1.0.exe` dosyasını indirip çalıştırın.
- **Taşınabilir sürüm:** `Passworder-Portable-0.1.0-win-x64.zip` dosyasını indirin, zipten çıkarın ve `Passworder.exe` dosyasını çalıştırın.
- Uygulama tamamen yerel çalışır; internet bağlantısı veya hesap gerekmez.

## Temel Özellikler

### Maksimum Güvenlik ve Gizlilik

- **Offline-first mimari:** Sunucu, bulut senkronizasyonu veya telemetri yoktur.
- **Güçlü şifreleme:** Kasa verileri `AES-256-GCM` ile korunur; kasa anahtarı ana şifreden `scrypt` ile türetilir.
- **Yerel depolama:** Veriler diskte yalnızca şifrelenmiş biçimde tutulur.

### Akıllı Araçlar

- **Şifre üretici:** Uzunluk ve karakter seçenekleriyle güçlü şifreler oluşturur.
- **Otomatik kilit:** Belirlenen süre işlem yapılmazsa kasayı kilitler.
- **Pano temizleme:** Kopyalanan şifreleri belirlenen süre sonunda panodan temizler.

### Modern Arayüz

- Electron, React, TypeScript ve Tailwind CSS ile geliştirilmiş sade masaüstü deneyimi.
- Hızlı arama, tek tıkla kopyalama ve kolay kayıt yönetimi.

![Passworder kasa ekranı](src/assets/readme/2.png)

## Geliştirici İçin Yayın Alma

Windows çıktısı üretmek için:

```bash
npm install
npm run release:win
```

Komut tamamlandığında `release/` klasöründe GitHub Release'e yüklenebilecek dosyalar oluşur:

- `Passworder-Setup-0.1.0.exe`
- `Passworder-Portable-0.1.0-win-x64.zip`
- `latest.yml`

GitHub'da yayınlamak için:

1. Repo sayfasında sağ taraftaki **Releases** alanından **Create a new release** seçin.
2. Tag alanına örnek olarak `v0.1.0` yazın.
3. Başlığa `Passworder v0.1.0` yazın.
4. `release/` klasöründeki `.exe`, `.zip` ve `latest.yml` dosyalarını **Assets** bölümüne sürükleyip bırakın.
5. **Publish release** butonuna basın.

![Passworder detay ekranı](src/assets/readme/1.png)

## Teknik Detaylar

- **Framework:** Electron + React + TypeScript
- **Arayüz:** Tailwind CSS
- **Kripto:** Node.js Crypto (`scrypt`, `AES-256-GCM`)
- **Depolama:** Yerel şifrelenmiş JSON tabanlı kasa

## İletişim

| Platform | Bilgi |
| :--- | :--- |
| Discord | remolgcum |
| E-posta | sadikahmet252525@gmail.com |
| Geliştirici | remolg |

---

Güvenliğiniz sizin elinizde. Passworder ile şifrelerinizi yerel ve şifreli bir kasada saklayın.
