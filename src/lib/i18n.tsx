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
  "nav.folders": "Folders",
  "nav.quickAdd": "Add",
  "nav.generator": "Create",
  "nav.settings": "Settings",
  "window.openMenu": "Open menu",
  "window.closeMenu": "Close menu",
  "window.lockVault": "Lock vault",
  "window.minimize": "Minimize",
  "window.close": "Close",
  "loading.title": "Preparing vault",
  "loading.description": "Verifying encrypted local session.",
  "status.lockedVault": "Vault locked",
  "status.updateAvailable": "Update available",
  "status.updateAvailableTitle": "New version available. Click to update.",
  "status.downloadUpdate": "Download update",
  "status.downloadUpdateTitle": "New version available. Click to download.",
  "dialog.deleteEntryTitle": "Delete entry?",
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
  "passwords.tags": "Tags",
  "passwords.new": "New",
  "passwords.searchPlaceholder": "Search...",
  "passwords.filterByTag": "Filter by tag",
  "passwords.clearFilters": "Clear filters",
  "passwords.emptyTitle": "No entries yet.",
  "passwords.emptyDescription": "Use the new entry action to add your first service.",
  "passwords.noResultsTitle": "No matching entries.",
  "passwords.noResultsDescription":
    "Try a different search or clear the active filters.",
  "passwords.createFirst": "Create First Entry",
  "passwords.copyUsername": "Copy username",
  "passwords.copyPassword": "Copy password",
  "passwords.noUsername": "No username",
  "passwords.showPassword": "Show password",
  "passwords.hidePassword": "Hide password",
  "passwords.editEntry": "Edit entry",
  "passwords.deleteEntry": "Delete entry",
  "folders.badge": "Folders",
  "folders.title": "My Folders",
  "folders.name": "Folder Name",
  "folders.namePlaceholder": "e.g. Valorant accounts",
  "folders.create": "Create Folder",
  "folders.createDescription": "Choose a folder name and logo.",
  "folders.emptyTitle": "No folders yet.",
  "folders.emptyDescription":
    "Create a folder to group related accounts and find them faster.",
  "folders.openFolder": "Open folder",
  "folders.editFolder": "Edit folder",
  "folders.editTitle": "Edit Folder",
  "folders.editDescription": "Change the folder name and logo.",
  "folders.logo": "Folder Logo",
  "folders.saveEdit": "Save Folder",
  "folders.reorderFolder": "Reorder folder",
  "folders.reorderEntry": "Reorder folder entry",
  "folders.deleteFolder": "Delete folder",
  "folders.deleteConfirm":
    "Delete {name}? Entries stay in the vault but leave this folder.",
  "folders.entriesTitle": "Folder Entries",
  "folders.emptyFolderTitle": "This folder is empty.",
  "folders.emptyFolderDescription":
    "Add a new entry directly into this folder.",
  "folders.addEntry": "Add Entry",
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
  "fields.usernameShortcut": "Username shortcut",
  "fields.password": "Password",
  "fields.passwordPlaceholder": "Enter or generate a strong password",
  "fields.passwordShortcut": "Password shortcut",
  "fields.shortcutPlaceholder": "Press F1 or Ctrl+Alt+U",
  "fields.shortcutHint": "Works while the vault is unlocked.",
  "fields.clearShortcut": "Clear shortcut",
  "fields.notes": "Notes",
  "fields.notesPlaceholder": "Recovery codes, backup email, 2FA notes...",
  "fields.tags": "Tags",
  "fields.tagsPlaceholder": "work, personal, finance",
  "fields.tagsHint": "Separate tags with commas.",
  "fields.logo": "Logo",
  "fields.logoHint": "Pick a logo to show it on the card. If you do not pick one, initials stay visible.",
  "fields.logoAutoTag": "\"{tag}\" tag will be added automatically.",
  "fields.logoFallback": "Use initials",
  "fields.folder": "Folder",
  "fields.folderNone": "Do not place in a folder",
  "fields.folderHint": "Choose one of your existing folders.",
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
  "generator.badge": "Password Studio",
  "generator.title": "New Password",
  "generator.refresh": "Refresh",
  "generator.copyPassword": "Copy password",
  "generator.loading": "Generating",
  "generator.length": "Password Length",
  "generator.uppercase": "Uppercase",
  "generator.lowercase": "Lowercase",
  "generator.numbers": "Numbers",
  "generator.symbols": "Symbols",
  "generator.localTitle": "Instant result",
  "generator.localDescription":
    "Adjust the options and the password refreshes immediately.",
  "generator.copy": "Copy",
  "generator.apply": "Add to Entry",
  "settings.badge": "Vault Settings",
  "settings.title": "Settings",
  "settings.description":
    "Local security preferences such as auto-lock and clipboard clear.",
  "settings.securityTitle": "Vault is secure",
  "settings.securityDescription":
    "All data is encrypted and decrypted on the same device.",
  "settings.masterPasswordLabel": "Master Password",
  "settings.masterPasswordDescription":
    "Re-encrypt the vault with a new master password without leaving the current session.",
  "settings.currentPasswordLabel": "Current Master Password",
  "settings.currentPasswordPlaceholder": "Enter the current master password",
  "settings.newPasswordLabel": "New Master Password",
  "settings.newPasswordPlaceholder": "Use at least 3 characters",
  "settings.confirmNewPasswordLabel": "Confirm New Password",
  "settings.confirmNewPasswordPlaceholder": "Enter the new master password again",
  "settings.changePassword": "Change Master Password",
  "settings.autoLockLabel": "Auto Lock",
  "settings.autoLockDescription": "Lock the vault automatically after inactivity.",
  "settings.clipboardLabel": "Clipboard Clear",
  "settings.clipboardDescription":
    "Remove copied data from the clipboard automatically.",
  "settings.languageLabel": "Language",
  "settings.languageDescription": "Choose the display language for the app.",
  "settings.transferLabel": "Import / Export",
  "settings.exportEntries": "Export Passwords",
  "settings.exportEntriesHint": "Create a JSON backup of your current vault.",
  "settings.importEntries": "Import Passwords",
  "settings.importEntriesHint": "Restore entries from a previous Passworder backup.",
  "settings.transferDescription":
    "Export your vault entries to a JSON backup and import them back into Passworder later.",
  "settings.storagePathLabel": "Local Storage Path",
  "settings.storagePathFallback": "Shown at runtime.",
  "edit.title": "Edit Entry",
  "edit.description":
    "When changes are saved, the entry is encrypted again inside the local vault.",
  "edit.save": "Save Changes",
  "errors.runtimeMissing":
    "Electron runtime was not found. Start the app as a desktop app with `npm run dev`.",
  "errors.desktopRestartRequired":
    "Electron bridge was updated. Fully restart the desktop app to use the latest actions.",
  "errors.importFileInvalid":
    "The selected file is not a valid Passworder export.",
  "errors.vaultLocked": "Vault is locked.",
  "errors.currentPasswordRequired": "Current master password cannot be empty.",
  "errors.newMasterPasswordRequired": "New master password cannot be empty.",
  "errors.masterPasswordTooShort":
    "Master password must be at least 3 characters.",
  "errors.entryServiceRequired": "Service / site is required.",
  "errors.entryPasswordRequired": "Password is required.",
  "errors.shortcutInvalid":
    "Use F1-F24 alone, or combine a key with Ctrl, Alt, or Shift.",
  "errors.shortcutDuplicate":
    "This shortcut is already assigned to another entry action.",
  "errors.vaultAlreadyExists": "Vault already exists.",
  "errors.masterPasswordInvalid": "Master password could not be verified.",
  "errors.entryNotFoundUpdate": "Entry to update was not found.",
  "errors.entryNotFoundDelete": "Entry to delete was not found.",
  "errors.folderNameRequired": "Folder name cannot be empty.",
  "errors.folderNameDuplicate": "A folder with this name already exists.",
  "errors.folderNotFound": "Folder was not found.",
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
  "notice.folderCreated": "Folder created.",
  "notice.folderUpdated": "Folder updated.",
  "notice.folderDeleted": "Folder deleted.",
  "notice.masterPasswordUpdated": "Master password updated.",
  "notice.exportCompleted": "Passwords exported.",
  "notice.importCompleted": "Passwords imported.",
  "notice.settingsSaved": "Vault settings saved.",
  "notice.copiedToClipboard": "Copied",
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
  "nav.folders": "Klasör",
  "nav.quickAdd": "Ekle",
  "nav.generator": "Oluştur",
  "nav.settings": "Ayarlar",
  "window.openMenu": "Menüyü aç",
  "window.closeMenu": "Menüyü kapat",
  "window.lockVault": "Kasayı kilitle",
  "window.minimize": "Küçült",
  "window.close": "Kapat",
  "loading.title": "Kasa hazırlanıyor",
  "loading.description": "Şifreli lokal oturum doğrulanıyor.",
  "status.lockedVault": "Kasa kilitli",
  "status.updateAvailable": "Yeni sürüm mevcut",
  "status.updateAvailableTitle": "Yeni sürüm mevcut. Güncellemek için tıkla.",
  "status.downloadUpdate": "Yeni sürümü indir",
  "status.downloadUpdateTitle": "Yeni sürüm mevcut. İndirmek için tıkla.",
  "dialog.deleteEntryTitle": "Kayıt silinsin mi?",
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
  "passwords.tags": "Etiketler",
  "passwords.new": "Yeni",
  "passwords.searchPlaceholder": "Ara...",
  "passwords.filterByTag": "Etikete göre filtrele",
  "passwords.clearFilters": "Filtreleri temizle",
  "passwords.emptyTitle": "Henüz kayıt yok.",
  "passwords.emptyDescription":
    "İlk servisi eklemek için yeni kayıt aksiyonunu kullanın.",
  "passwords.noResultsTitle": "Eşleşen kayıt yok.",
  "passwords.noResultsDescription":
    "Farklı bir arama yapın veya aktif filtreleri temizleyin.",
  "passwords.createFirst": "İlk Kaydı Oluştur",
  "passwords.copyUsername": "Kullanıcı adını kopyala",
  "passwords.copyPassword": "Şifreyi kopyala",
  "passwords.noUsername": "Kullanıcı adı yok",
  "passwords.showPassword": "Şifreyi göster",
  "passwords.hidePassword": "Şifreyi gizle",
  "passwords.editEntry": "Kaydı düzenle",
  "passwords.deleteEntry": "Kaydı sil",
  "folders.badge": "Klasörler",
  "folders.title": "Klasörlerim",
  "folders.name": "Klasör Adı",
  "folders.namePlaceholder": "Örn. Valorant hesapları",
  "folders.create": "Klasör Oluştur",
  "folders.createDescription": "Klasör adını ve logosunu seçin.",
  "folders.emptyTitle": "Henüz klasör yok.",
  "folders.emptyDescription":
    "İlgili hesapları gruplamak ve daha hızlı bulmak için klasör oluşturun.",
  "folders.openFolder": "Klasörü aç",
  "folders.editFolder": "Klasörü düzenle",
  "folders.editTitle": "Klasörü Düzenle",
  "folders.editDescription": "Klasör adını ve logosunu değiştirin.",
  "folders.logo": "Klasör Logosu",
  "folders.saveEdit": "Klasörü Kaydet",
  "folders.reorderFolder": "Klasörü taşı",
  "folders.reorderEntry": "Klasördeki kaydı taşı",
  "folders.deleteFolder": "Klasörü sil",
  "folders.deleteConfirm":
    "{name} klasörü silinsin mi? Kayıtlar kasada kalır ancak klasörden çıkarılır.",
  "folders.entriesTitle": "Klasördeki Kayıtlar",
  "folders.emptyFolderTitle": "Bu klasör boş.",
  "folders.emptyFolderDescription":
    "Yeni kaydı doğrudan bu klasörün içine ekleyin.",
  "folders.addEntry": "Kayıt Ekle",
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
  "fields.usernameShortcut": "Kullanıcı adı kısayolu",
  "fields.password": "Şifre",
  "fields.passwordPlaceholder": "Güçlü bir parola girin veya üretin",
  "fields.passwordShortcut": "Şifre kısayolu",
  "fields.shortcutPlaceholder": "F1 veya Ctrl+Alt+U tuşlayın",
  "fields.shortcutHint": "Kasa açıkken çalışır.",
  "fields.clearShortcut": "Kısayolu temizle",
  "fields.notes": "Notlar",
  "fields.notesPlaceholder": "Kurtarma kodları, yedek e-posta, 2FA notları...",
  "fields.tags": "Etiketler",
  "fields.tagsPlaceholder": "iş, kişisel, finans",
  "fields.tagsHint": "Etiketleri virgülle ayırın.",
  "fields.logo": "Logo",
  "fields.logoHint": "Bir logo seçersen kartta o görünür. Seçmezsen baş harfler görünmeye devam eder.",
  "fields.logoAutoTag": "\"{tag}\" etiketi otomatik eklenir.",
  "fields.logoFallback": "Baş harfleri kullan",
  "fields.folder": "Klasör",
  "fields.folderNone": "Klasöre koyma",
  "fields.folderHint": "Mevcut klasörlerinizden birini seçin.",
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
  "generator.badge": "Parola Stüdyosu",
  "generator.title": "Yeni Parola",
  "generator.refresh": "Yenile",
  "generator.copyPassword": "Şifreyi kopyala",
  "generator.loading": "Hazırlanıyor",
  "generator.length": "Şifre Uzunluğu",
  "generator.uppercase": "Büyük Harf",
  "generator.lowercase": "Küçük Harf",
  "generator.numbers": "Rakam",
  "generator.symbols": "Sembol",
  "generator.localTitle": "Anında sonuç",
  "generator.localDescription":
    "Ayarları değiştirin, parola hemen yenilensin.",
  "generator.copy": "Kopyala",
  "generator.apply": "Kayda Ekle",
  "settings.badge": "Kasa Ayarları",
  "settings.title": "Ayarlar",
  "settings.description":
    "Otomatik kilit ve pano temizleme gibi lokal güvenlik tercihleri.",
  "settings.securityTitle": "Kasa güvenli modda",
  "settings.securityDescription":
    "Tüm veriler aynı cihaz üzerinde şifrelenir ve çözülür.",
  "settings.masterPasswordLabel": "Master Password",
  "settings.masterPasswordDescription":
    "Kasayı oturumu kapatmadan yeni bir master password ile yeniden şifreleyin.",
  "settings.currentPasswordLabel": "Mevcut Master Password",
  "settings.currentPasswordPlaceholder": "Mevcut master password girin",
  "settings.newPasswordLabel": "Yeni Master Password",
  "settings.newPasswordPlaceholder": "En az 3 karakter kullanın",
  "settings.confirmNewPasswordLabel": "Yeni Şifre Tekrar",
  "settings.confirmNewPasswordPlaceholder": "Yeni master password tekrar girin",
  "settings.changePassword": "Master Password Değiştir",
  "settings.autoLockLabel": "Otomatik Kilit",
  "settings.autoLockDescription": "Kasa pasif kaldığında otomatik kilitlensin.",
  "settings.clipboardLabel": "Pano Temizleme",
  "settings.clipboardDescription":
    "Kopyalanan veriler panodan otomatik olarak silinsin.",
  "settings.languageLabel": "Dil",
  "settings.languageDescription": "Uygulamanın görüntüleme dilini seçin.",
  "settings.transferLabel": "İçe / Dışa Aktar",
  "settings.exportEntries": "Şifreleri Dışa Aktar",
  "settings.exportEntriesHint": "Mevcut kasanın JSON yedeğini oluşturun.",
  "settings.importEntries": "Şifreleri İçe Aktar",
  "settings.importEntriesHint": "Eski bir Passworder yedeğinden kayıtları geri yükleyin.",
  "settings.transferDescription":
    "Kasa kayıtlarını JSON yedeği olarak dışa aktarabilir ve daha sonra Passworder içine geri alabilirsiniz.",
  "settings.storagePathLabel": "Lokal Veri Yolu",
  "settings.storagePathFallback": "Çalışma zamanında gösterilecek.",
  "edit.title": "Kaydı Düzenle",
  "edit.description":
    "Değişiklikler kaydedildiğinde kayıt lokal kasada tekrar şifrelenir.",
  "edit.save": "Değişiklikleri Kaydet",
  "errors.runtimeMissing":
    "Electron çalışma zamanı bulunamadı. Uygulamayı masaüstü olarak `npm run dev` ile başlatın.",
  "errors.desktopRestartRequired":
    "Electron köprüsü güncellendi. En yeni işlemleri kullanmak için masaüstü uygulamayı tamamen yeniden başlatın.",
  "errors.importFileInvalid":
    "Seçilen dosya geçerli bir Passworder aktarım dosyası değil.",
  "errors.vaultLocked": "Kasa kilitli.",
  "errors.currentPasswordRequired": "Mevcut master password boş bırakılamaz.",
  "errors.newMasterPasswordRequired": "Yeni master password boş bırakılamaz.",
  "errors.masterPasswordTooShort":
    "Master password en az 3 karakter olmalı.",
  "errors.entryServiceRequired": "Servis / site alanı zorunlu.",
  "errors.entryPasswordRequired": "Şifre alanı zorunlu.",
  "errors.shortcutInvalid":
    "F1-F24 tek başına kullanılabilir; diğer tuşları Ctrl, Alt veya Shift ile kullanın.",
  "errors.shortcutDuplicate":
    "Bu kısayol başka bir kayıt işlemine atanmış.",
  "errors.vaultAlreadyExists": "Kasa zaten mevcut.",
  "errors.masterPasswordInvalid": "Master password doğrulanamadı.",
  "errors.entryNotFoundUpdate": "Güncellenecek kayıt bulunamadı.",
  "errors.entryNotFoundDelete": "Silinecek kayıt bulunamadı.",
  "errors.folderNameRequired": "Klasör adı boş bırakılamaz.",
  "errors.folderNameDuplicate": "Bu isimde bir klasör zaten var.",
  "errors.folderNotFound": "Klasör bulunamadı.",
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
  "notice.folderCreated": "Klasör oluşturuldu.",
  "notice.folderUpdated": "Klasör güncellendi.",
  "notice.folderDeleted": "Klasör silindi.",
  "notice.masterPasswordUpdated": "Master password güncellendi.",
  "notice.exportCompleted": "Şifreler dışa aktarıldı.",
  "notice.importCompleted": "Şifreler içe aktarıldı.",
  "notice.settingsSaved": "Kasa ayarları kaydedildi.",
  "notice.copiedToClipboard": "Kopyalandı",
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
