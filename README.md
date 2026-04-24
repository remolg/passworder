# Passworder

Passworder, şifrelerinizi tamamen lokal olarak saklayan küçük bir masaüstü şifre yöneticisidir. Uygulama Electron ile çalışır; pencere kapatıldığında arka planda sistem tepsisinde kalır ve bilgisayar açıldığında simge olarak otomatik başlar.

## Özellikler

- Lokal ve şifreli kasa dosyası
- Şifre ekleme, düzenleme, silme ve sıralama
- Güçlü şifre üretici
- JSON içe/dışa aktarma
- Sistem tepsisi simgesi ve otomatik başlangıç

## Kurulum

Geliştirme için:

```bash
npm install
npm run dev
```

Windows kurulum dosyası oluşturmak için:

```bash
npm run package:win
```

Oluşan kurulum dosyası `release` klasörüne yazılır.

## Kullanım

- `X` düğmesi uygulamayı tamamen kapatmaz, yalnızca gizler.
- Uygulamayı tekrar açmak için sistem tepsisindeki Passworder simgesine tıklayın.
- Tamamen kapatmak için tepsi menüsünden `Tamamen kapat` seçeneğini kullanın.
- Kurulu uygulama Windows açılışında otomatik olarak tepsi simgesiyle başlar.
