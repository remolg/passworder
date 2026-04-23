import { createContext, type ReactNode, useContext } from "react";

import { AppLanguage } from "@/types/vault";

export const LANGUAGE_STORAGE_KEY = "passworder.language";

const EN_TRANSLATIONS = {
  "common.local": "Local",
  "common.vault": "Vault",
  "common.cancel": "Cancel",
  "common.minutesShort": "{count} min",
  "common.secondsShort": "{count} sec",
  "common.itemsCount": "{count} items",
  "common.english": "English",
  "common.turkish": "Türkçe",
  "nav.passwords": "Vault",
  "nav.quickAdd": "Add",
  "nav.generator": "Generate",
  "nav.settings": "Settings",
  "window.openMenu": "Open menu",
  "window.closeMenu": "Close menu",
  "window.lockVault": "Lock vault",
  "window.minimize": "Minimize",
  "window.close": "Close",
  "loading.title": "Preparing vault",
  "loading.description": "Verifying encrypted local session.",
  "status.lockedVault": "Encrypted local vault",
  "dialog.deleteEntryConfirm": "Are you sure you want to delete {service}?",
  "unlock.badgeLocked": "Vault Locked",
  "unlock.badgeNew": "New Local Vault",
  "unlock.titleLocked": "Unlock Vault",
  "unlock.titleNew": "Create Vault",
  "unlock.descriptionLocked":
    "Unlock your encrypted vault with the master password on this device only.",
  "unlock.descriptionNew":
    "Choose a strong master password for first use. Data is stored locally only.",
  "unlock.runtimeMissing":
    "Secure vault actions are only available inside the Electron desktop runtime.",
  "unlock.masterPassword": "Master Password",
  "unlock.confirmPassword": "Confirm Password",
  "unlock.confirmLabel": "Enter Again",
  "unlock.masterPlaceholder": "Use a long and strong password",
  "unlock.confirmPlaceholder": "Enter the master password again",
  "unlock.hidePassword": "Hide password",
  "unlock.showPassword": "Show password",
  "unlock.unlockButton": "Unlock Vault",
  "unlock.createButton": "Create Vault",
  "unlock.footerSecurity": "Local only • AES-256 GCM • Scrypt",
  "unlock.storageFallback": "Stored in the app data directory.",
  "passwords.badge": "Vault Items",
  "passwords.title": "My Passwords",
  "passwords.new": "New",
  "passwords.searchPlaceholder": "Search...",
  "passwords.emptyTitle": "No entries yet.",
  "passwords.emptyDescription": "Use the new entry action to add your first service.",
  "passwords.createFirst": "Create First Entry",
  "passwords.copyUsername": "Copy username",
  "passwords.copyPassword": "Copy password",
  "passwords.noUsername": "No username",
  "passwords.showPassword": "Show password",
  "passwords.hidePassword": "Hide password",
  "passwords.editEntry": "Edit entry",
  "passwords.deleteEntry": "Delete entry",
  "quickAdd.back": "Back",
  "quickAdd.badge": "Add New Secret",
  "quickAdd.title": "Quick Add",
  "quickAdd.description": "Write a new entry directly into the encrypted local vault.",
  "quickAdd.footerNote":
    "When you save, data is encrypted again and written back to this device.",
  "quickAdd.save": "Save to Vault",
  "fields.service": "Service Name",
  "fields.servicePlaceholder": "e.g. GitHub, Figma, Gmail",
  "fields.url": "URL / App Identifier",
  "fields.urlPlaceholder": "https://github.com/login",
  "fields.username": "Username or Email",
  "fields.usernamePlaceholder": "user@example.com",
  "fields.password": "Password",
  "fields.passwordPlaceholder": "Enter or generate a strong password",
  "fields.notes": "Notes",
  "fields.notesPlaceholder": "Recovery codes, backup email, 2FA notes...",
  "fields.tags": "Tags",
  "fields.tagsPlaceholder": "work, personal, finance",
  "fields.generate": "Generate",
  "fields.copyPassword": "Copy password",
  "fields.showPassword": "Show password",
  "fields.hidePassword": "Hide password",
  "strength.empty": "Empty",
  "strength.veryWeak": "Very Weak",
  "strength.weak": "Weak",
  "strength.medium": "Medium",
  "strength.strong": "Strong",
  "strength.veryStrong": "Very Strong",
  "generator.badge": "Generated Password",
  "generator.title": "Password Generator",
  "generator.refresh": "Refresh",
  "generator.copyPassword": "Copy password",
  "generator.loading": "Generating",
  "generator.length": "Password Length",
  "generator.uppercase": "Uppercase",
  "generator.lowercase": "Lowercase",
  "generator.numbers": "Numbers",
  "generator.symbols": "Symbols",
  "generator.localTitle": "Local generation enabled",
  "generator.localDescription":
    "Passwords are generated on this device. Similar characters are filtered out automatically: I, l, O, 0.",
  "generator.copy": "Copy",
  "generator.apply": "Add to Entry",
  "settings.badge": "Vault Settings",
  "settings.title": "Settings",
  "settings.description":
    "Local security preferences such as auto-lock and clipboard clear.",
  "settings.securityTitle": "Vault is secure",
  "settings.securityDescription":
    "All data is encrypted and decrypted on the same device.",
  "settings.autoLockLabel": "Auto Lock",
  "settings.autoLockDescription": "Lock the vault automatically after inactivity.",
  "settings.clipboardLabel": "Clipboard Clear",
  "settings.clipboardDescription":
    "Remove copied data from the clipboard automatically.",
  "settings.languageLabel": "Language",
  "settings.languageDescription": "Choose the display language for the app.",
  "settings.transferLabel": "Import / Export",
  "settings.exportEntries": "Export Passwords",
  "settings.importEntries": "Import Passwords",
  "settings.transferDescription":
    "Export your vault entries to a JSON backup and import them back into Passworder later.",
  "settings.storagePathLabel": "Local Storage Path",
  "settings.storagePathFallback": "Shown at runtime.",
  "settings.lockNow": "Lock Vault Now",
  "edit.title": "Edit Entry",
  "edit.description":
    "When changes are saved, the entry is encrypted again inside the local vault.",
  "edit.save": "Save Changes",
  "errors.runtimeMissing":
    "Electron runtime was not found. Start the app as a desktop app with `npm run dev`.",
  "errors.desktopRestartRequired":
    "Electron bridge was updated. Fully restart the desktop app to use drag sorting.",
  "errors.importFileInvalid":
    "The selected file is not a valid Passworder export.",
  "errors.vaultLocked": "Vault is locked.",
  "errors.masterPasswordTooShort":
    "Master password must be at least 12 characters.",
  "errors.entryServiceRequired": "Service / site is required.",
  "errors.entryPasswordRequired": "Password is required.",
  "errors.vaultAlreadyExists": "Vault already exists.",
  "errors.masterPasswordInvalid": "Master password could not be verified.",
  "errors.entryNotFoundUpdate": "Entry to update was not found.",
  "errors.entryNotFoundDelete": "Entry to delete was not found.",
  "errors.passwordGroupRequired": "Select at least one character group.",
  "errors.passwordLengthTooShort":
    "Length cannot be smaller than the number of selected character groups.",
  "errors.unexpected": "An unexpected error occurred.",
  "errors.masterPasswordRequired": "Master password cannot be empty.",
  "errors.masterPasswordMismatch": "Master password fields do not match.",
  "notice.vaultCreated": "New vault created.",
  "notice.vaultUnlocked": "Vault unlocked.",
  "notice.vaultLocked": "Vault locked.",
  "notice.entryUpdated": "Entry updated.",
  "notice.entryCreated": "New entry added.",
  "notice.entryDeleted": "Entry deleted.",
  "notice.exportCompleted": "Passwords exported.",
  "notice.importCompleted": "Passwords imported.",
  "notice.settingsSaved": "Vault settings saved.",
  "notice.copiedToClipboard": "Copied to clipboard.",
} as const;

export type TranslationKey = keyof typeof EN_TRANSLATIONS;

const TR_TRANSLATIONS: Record<TranslationKey, string> = {
  "common.local": "Lokal",
  "common.vault": "Kasa",
  "common.cancel": "Vazgeç",
  "common.minutesShort": "{count} dk",
  "common.secondsShort": "{count} sn",
  "common.itemsCount": "{count} kayıt",
  "common.english": "English",
  "common.turkish": "Türkçe",
  "nav.passwords": "Kasa",
  "nav.quickAdd": "Ekle",
  "nav.generator": "Üret",
  "nav.settings": "Ayarlar",
  "window.openMenu": "Menüyü aç",
  "window.closeMenu": "Menüyü kapat",
  "window.lockVault": "Kasayı kilitle",
  "window.minimize": "Küçült",
  "window.close": "Kapat",
  "loading.title": "Kasa hazırlanıyor",
  "loading.description": "Şifreli lokal oturum doğrulanıyor.",
  "status.lockedVault": "Şifreli lokal kasa",
  "dialog.deleteEntryConfirm":
    "{service} kaydını silmek istediğinize emin misiniz?",
  "unlock.badgeLocked": "Kasa Kilitli",
  "unlock.badgeNew": "Yeni Lokal Kasa",
  "unlock.titleLocked": "Kasayı Aç",
  "unlock.titleNew": "Kasa Oluştur",
  "unlock.descriptionLocked":
    "Şifreli kasanızı yalnızca bu cihaz üzerinde master password ile açın.",
  "unlock.descriptionNew":
    "İlk kullanım için güçlü bir master password belirleyin. Veriler yalnızca lokal olarak tutulur.",
  "unlock.runtimeMissing":
    "Güvenli kasa işlemleri yalnızca Electron masaüstü çalışma zamanında kullanılabilir.",
  "unlock.masterPassword": "Master Password",
  "unlock.confirmPassword": "Master Password Tekrar",
  "unlock.confirmLabel": "Tekrar Girin",
  "unlock.masterPlaceholder": "Uzun ve güçlü bir parola kullanın",
  "unlock.confirmPlaceholder": "Master password tekrar girin",
  "unlock.hidePassword": "Parolayı gizle",
  "unlock.showPassword": "Parolayı göster",
  "unlock.unlockButton": "Kasayı Aç",
  "unlock.createButton": "Kasayı Oluştur",
  "unlock.footerSecurity": "Yalnızca lokal • AES-256 GCM • Scrypt",
  "unlock.storageFallback": "Uygulama veri klasöründe saklanır.",
  "passwords.badge": "Kasa Öğeleri",
  "passwords.title": "Şifrelerim",
  "passwords.new": "Yeni",
  "passwords.searchPlaceholder": "Ara...",
  "passwords.emptyTitle": "Henüz kayıt yok.",
  "passwords.emptyDescription":
    "İlk servisi eklemek için yeni kayıt aksiyonunu kullanın.",
  "passwords.createFirst": "İlk Kaydı Oluştur",
  "passwords.copyUsername": "Kullanıcı adını kopyala",
  "passwords.copyPassword": "Şifreyi kopyala",
  "passwords.noUsername": "Kullanıcı adı yok",
  "passwords.showPassword": "Şifreyi göster",
  "passwords.hidePassword": "Şifreyi gizle",
  "passwords.editEntry": "Kaydı düzenle",
  "passwords.deleteEntry": "Kaydı sil",
  "quickAdd.back": "Geri",
  "quickAdd.badge": "Yeni Gizli Bilgi Ekle",
  "quickAdd.title": "Hızlı Ekle",
  "quickAdd.description": "Yeni kaydı doğrudan şifreli lokal kasaya yazın.",
  "quickAdd.footerNote":
    "Kaydettiğinizde veriler tekrar şifrelenir ve bu cihaza yazılır.",
  "quickAdd.save": "Kasaya Kaydet",
  "fields.service": "Servis Adı",
  "fields.servicePlaceholder": "Örn. GitHub, Figma, Gmail",
  "fields.url": "URL / Uygulama Kimliği",
  "fields.urlPlaceholder": "https://github.com/login",
  "fields.username": "Kullanıcı Adı veya E-posta",
  "fields.usernamePlaceholder": "kullanici@ornek.com",
  "fields.password": "Şifre",
  "fields.passwordPlaceholder": "Güçlü bir parola girin veya üretin",
  "fields.notes": "Notlar",
  "fields.notesPlaceholder": "Kurtarma kodları, yedek e-posta, 2FA notları...",
  "fields.tags": "Etiketler",
  "fields.tagsPlaceholder": "iş, kişisel, finans",
  "fields.generate": "Üret",
  "fields.copyPassword": "Şifreyi kopyala",
  "fields.showPassword": "Şifreyi göster",
  "fields.hidePassword": "Şifreyi gizle",
  "strength.empty": "Boş",
  "strength.veryWeak": "Çok Zayıf",
  "strength.weak": "Zayıf",
  "strength.medium": "Orta",
  "strength.strong": "Güçlü",
  "strength.veryStrong": "Çok Güçlü",
  "generator.badge": "Üretilen Şifre",
  "generator.title": "Şifre Üretici",
  "generator.refresh": "Yenile",
  "generator.copyPassword": "Şifreyi kopyala",
  "generator.loading": "Hazırlanıyor",
  "generator.length": "Şifre Uzunluğu",
  "generator.uppercase": "Büyük Harf",
  "generator.lowercase": "Küçük Harf",
  "generator.numbers": "Rakam",
  "generator.symbols": "Sembol",
  "generator.localTitle": "Lokal üretim aktif",
  "generator.localDescription":
    "Şifreler bu cihazda üretilir. Benzer karakterler otomatik olarak ayıklanır: I, l, O, 0.",
  "generator.copy": "Kopyala",
  "generator.apply": "Kayda Ekle",
  "settings.badge": "Kasa Ayarları",
  "settings.title": "Ayarlar",
  "settings.description":
    "Otomatik kilit ve pano temizleme gibi lokal güvenlik tercihleri.",
  "settings.securityTitle": "Kasa güvenli modda",
  "settings.securityDescription":
    "Tüm veriler aynı cihaz üzerinde şifrelenir ve çözülür.",
  "settings.autoLockLabel": "Otomatik Kilit",
  "settings.autoLockDescription": "Kasa pasif kaldığında otomatik kilitlensin.",
  "settings.clipboardLabel": "Pano Temizleme",
  "settings.clipboardDescription":
    "Kopyalanan veriler panodan otomatik olarak silinsin.",
  "settings.languageLabel": "Dil",
  "settings.languageDescription": "Uygulamanın görüntüleme dilini seçin.",
  "settings.transferLabel": "İçe / Dışa Aktar",
  "settings.exportEntries": "Şifreleri Dışa Aktar",
  "settings.importEntries": "Şifreleri İçe Aktar",
  "settings.transferDescription":
    "Kasa kayıtlarını JSON yedeği olarak dışa aktarabilir ve daha sonra Passworder içine geri alabilirsiniz.",
  "settings.storagePathLabel": "Lokal Veri Yolu",
  "settings.storagePathFallback": "Çalışma zamanında gösterilecek.",
  "settings.lockNow": "Kasayı Şimdi Kilitle",
  "edit.title": "Kaydı Düzenle",
  "edit.description":
    "Değişiklikler kaydedildiğinde kayıt lokal kasada tekrar şifrelenir.",
  "edit.save": "Değişiklikleri Kaydet",
  "errors.runtimeMissing":
    "Electron çalışma zamanı bulunamadı. Uygulamayı masaüstü olarak `npm run dev` ile başlatın.",
  "errors.desktopRestartRequired":
    "Electron köprüsü güncellendi. Sürükleyerek sıralama için masaüstü uygulamayı tamamen yeniden başlatın.",
  "errors.importFileInvalid":
    "Seçilen dosya geçerli bir Passworder aktarım dosyası değil.",
  "errors.vaultLocked": "Kasa kilitli.",
  "errors.masterPasswordTooShort":
    "Master password en az 12 karakter olmalı.",
  "errors.entryServiceRequired": "Servis / site alanı zorunlu.",
  "errors.entryPasswordRequired": "Şifre alanı zorunlu.",
  "errors.vaultAlreadyExists": "Kasa zaten mevcut.",
  "errors.masterPasswordInvalid": "Master password doğrulanamadı.",
  "errors.entryNotFoundUpdate": "Güncellenecek kayıt bulunamadı.",
  "errors.entryNotFoundDelete": "Silinecek kayıt bulunamadı.",
  "errors.passwordGroupRequired": "En az bir karakter grubu seçin.",
  "errors.passwordLengthTooShort":
    "Uzunluk, seçilen karakter grubu sayısından küçük olamaz.",
  "errors.unexpected": "Beklenmeyen bir hata oluştu.",
  "errors.masterPasswordRequired": "Master password boş bırakılamaz.",
  "errors.masterPasswordMismatch": "Master password alanları eşleşmiyor.",
  "notice.vaultCreated": "Yeni kasa oluşturuldu.",
  "notice.vaultUnlocked": "Kasa açıldı.",
  "notice.vaultLocked": "Kasa kilitlendi.",
  "notice.entryUpdated": "Kayıt güncellendi.",
  "notice.entryCreated": "Yeni kayıt eklendi.",
  "notice.entryDeleted": "Kayıt silindi.",
  "notice.exportCompleted": "Şifreler dışa aktarıldı.",
  "notice.importCompleted": "Şifreler içe aktarıldı.",
  "notice.settingsSaved": "Kasa ayarları kaydedildi.",
  "notice.copiedToClipboard": "Panoya kopyalandı.",
};

const TRANSLATIONS: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: EN_TRANSLATIONS,
  tr: TR_TRANSLATIONS,
};

type TranslationValues = Record<string, string | number>;

interface I18nContextValue {
  language: AppLanguage;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  resolveText: (value: string | null | undefined, values?: TranslationValues) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "tr";
}

export function isTranslationKey(value: string): value is TranslationKey {
  return Object.prototype.hasOwnProperty.call(EN_TRANSLATIONS, value);
}

export function getStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(value) ? value : "en";
  } catch {
    return "en";
  }
}

export function persistLanguage(language: AppLanguage) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {}
}

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  values?: TranslationValues,
) {
  return formatMessage(TRANSLATIONS[language][key], values);
}

export function I18nProvider({
  children,
  language,
}: {
  children: ReactNode;
  language: AppLanguage;
}) {
  return (
    <I18nContext.Provider
      value={{
        language,
        t: (key, values) => translate(language, key, values),
        resolveText: (value, values) => {
          if (!value) {
            return "";
          }

          if (isTranslationKey(value)) {
            return translate(language, value, values);
          }

          return formatMessage(value, values);
        },
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("I18nProvider is missing.");
  }

  return context;
}

function formatMessage(template: string, values?: TranslationValues) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (values[key] === undefined) {
      return `{${key}}`;
    }

    return String(values[key]);
  });
}
