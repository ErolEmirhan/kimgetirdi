/**
 * Firebase Auth'a admin kullanıcıları ekler.
 * Kullanıcı adı → email: username@kimgetirdi.local
 *
 * Kullanım:
 * 1. Firebase Console > Project Settings > Service accounts > Generate new private key
 * 2. Dosyayı proje köküne kaydedin (örn. firebase-admin-key.json) ve .gitignore'a ekleyin
 * 3. ADMIN_ACCOUNTS dosyasını oluşturun (aşağıdaki örnek) veya env ile verin
 *
 * Örnek admin-accounts.json (proje kökünde, .gitignore'da olsun):
 * [
 *   { "username": "admin", "password": "GucluSifre123" },
 *   { "username": "admin2", "password": "BaskaSifre456" }
 * ]
 *
 * Çalıştırma:
 *   set GOOGLE_APPLICATION_CREDENTIALS=firebase-admin-key.json
 *   node scripts/create-admin-users.js
 *
 * veya admin-accounts.json path ile:
 *   node scripts/create-admin-users.js admin-accounts.json
 */

const path = require("path");
const fs = require("fs");

const ADMIN_EMAIL_SUFFIX = "@kimgetirdi.local";

async function main() {
  let firebaseAdmin;
  try {
    firebaseAdmin = require("firebase-admin");
  } catch (e) {
    console.error("firebase-admin yüklü değil. Çalıştırın: npm install firebase-admin");
    process.exit(1);
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), "firebase-admin-key.json");
  if (!fs.existsSync(keyPath)) {
    console.error("Servis hesabı anahtarı bulunamadı:", keyPath);
    console.error("Firebase Console > Project settings > Service accounts > Generate new private key");
    process.exit(1);
  }

  const accountsPath = process.argv[2] || path.join(process.cwd(), "admin-accounts.json");
  if (!fs.existsSync(accountsPath)) {
    console.error("Hesap dosyası bulunamadı:", accountsPath);
    console.error("Örnek admin-accounts.json oluşturun:");
    console.error(JSON.stringify([
      { username: "admin", password: "Sifre123" },
      { username: "admin2", password: "Sifre456" },
    ], null, 2));
    process.exit(1);
  }

  let accounts;
  try {
    accounts = JSON.parse(fs.readFileSync(accountsPath, "utf8"));
  } catch (e) {
    console.error("admin-accounts.json okunamadı:", e.message);
    process.exit(1);
  }

  if (!Array.isArray(accounts) || accounts.length === 0) {
    console.error("admin-accounts.json en az bir { username, password } içermeli.");
    process.exit(1);
  }

  if (!firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(require(path.resolve(keyPath))) });
  }
  const auth = firebaseAdmin.auth();

  for (const { username, password } of accounts) {
    const u = (username || "").trim();
    const p = password || "";
    if (!u) {
      console.warn("Boş username atlanıyor.");
      continue;
    }
    const email = u.includes("@") ? u : u + ADMIN_EMAIL_SUFFIX;
    if (p.length < 6) {
      console.warn(email, "- şifre en az 6 karakter olmalı, atlanıyor.");
      continue;
    }
    try {
      await auth.createUser({ email, password: p, emailVerified: true });
      console.log("Oluşturuldu:", email);
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        console.log("Zaten var (güncelleme):", email);
        const user = await auth.getUserByEmail(email);
        await auth.updateUser(user.uid, { password: p });
        console.log("  Şifre güncellendi.");
      } else {
        console.error(email, err.message);
      }
    }
  }
  console.log("Bitti.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
