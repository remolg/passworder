
# Project Title

A brief description of what this project does and who it's for

# PASSWORDER

**Passworder**, dijital güvenliğinizi en üst seviyeye taşımak için tasarlanmış, **gizlilik odaklı (privacy-first)** ve tamamen **çevrimdışı (offline)** çalışan modern bir masaüstü şifre yöneticisidir. Verileriniz asla buluta çıkmaz; sadece sizin cihazınızda, sizin kontrolünüzde kalır.

![Logo](/src/assets/readme/3.png)


### 🛡️ Temel Özellikler

**Maksimum Güvenlik ve Gizlilik**
* **Offline-First Mimari:** Sunucu, bulut senkronizasyonu veya telemetri takibi yoktur. Tüm verileriniz yalnızca yerel cihazınızda saklanır.
* **Askeri Düzeyde Şifreleme:** Kasa verileriniz **AES-256-GCM** algoritması ile korunur. Kasa anahtarınız ise **scrypt** kullanılarak ana şifrenizden (master password) türetilir.
* **Bellek Güvenliği:** Kasa kilitlendiğinde hassas veriler bellekten temizlenir; veriler diskte yalnızca şifreli bir "blob" olarak tutulur.

**Akıllı Otomasyon ve Araçlar**
* **Password Studio (Şifre Üretici):** İhtiyacınıza göre uzunluk, karakter tipi ve karmaşıklık kriterlerini belirleyerek saniyeler içinde güçlü şifreler oluşturun.
* **Otomatik Kilit (Auto Lock):** Belirlediğiniz süre boyunca işlem yapılmadığında kasa kendini otomatik olarak kilitler.
* **Pano Temizleyici:** Kopyaladığınız şifreler, belirlediğiniz süre sonunda sistem panosundan (clipboard) otomatik olarak silinir.

**Modern ve Kullanıcı Dostu Arayüz**
* **Minimalist Tasarım:** Electron, React ve Tailwind CSS (shadcn/ui) ile geliştirilen, göz yormayan, profesyonel masaüstü deneyimi.
* **Hızlı Erişim:** Şifreler arasında anlık arama yapın, tek tıkla kopyalayın veya kayıtlarınızı kolayca yönetin.

![Logo](/src/assets/readme/2.png)

### ⚙️ Teknik Detaylar

* **Framework:** Electron + React + TypeScript
* **UI Bileşenleri:** shadcn/ui & Tailwind CSS
* **Kripto:** Node.js Crypto (scrypt & AES-256-GCM)
* **Veri Yapısı:** Yerel şifrelenmiş JSON tabanlı güvenli depolama.

![Logo](/src/assets/readme/1.png)

### 📞 İletişim

Uygulama ile ilgili sorularınız veya iş birliği talepleriniz için bana ulaşabilirsiniz:

| Platform | Bilgi / Link |
| :--- | :--- |
| **Discord** | remolgcum |
| **E-posta** | sadikahmet252525@gmail.com |
| **Geliştirici** | remolg |

---
*Güvenliğiniz sizin elinizde. Passworder ile şifrelerinizi yerel ve şifreli bir kalede saklayın.*