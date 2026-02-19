/**
 * .env.local içindeki NEXT_PUBLIC_FIREBASE_* değişkenlerini Vercel'e ekler.
 * Kullanım: npx vercel link   (bir kez, proje bağlı değilse)
 *          node scripts/vercel-env-from-local.js
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error(".env.local bulunamadı. Önce proje kökünde .env.local oluşturup Firebase değerlerini ekleyin.");
  process.exit(1);
}

const content = fs.readFileSync(envPath, "utf8");
const vars = [];
for (const line of content.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) continue;
  const key = match[1];
  const value = match[2].replace(/^["']|["']$/g, "").trim();
  if (key.startsWith("NEXT_PUBLIC_FIREBASE_")) vars.push({ key, value });
}

if (vars.length === 0) {
  console.error(".env.local içinde NEXT_PUBLIC_FIREBASE_* ile başlayan değişken yok.");
  process.exit(1);
}

function addEnv(key, value) {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["vercel", "env", "add", key, "production", "--yes", "--force"], {
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
    });
    proc.stdin.write(value, "utf8", () => {
      proc.stdin.end();
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
}

(async () => {
  console.log("Vercel'e", vars.length, "Firebase env değişkeni ekleniyor...");
  for (const { key, value } of vars) {
    try {
      await addEnv(key, value);
      console.log("  OK:", key);
    } catch (e) {
      console.error("  HATA:", key, e.message);
    }
  }
  console.log("Bitti. Yeni deploy almak için: npx vercel --prod");
})();
