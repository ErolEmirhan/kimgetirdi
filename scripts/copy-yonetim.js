const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const files = fs.readdirSync(cwd);
const yonetim = files.find((f) => f.endsWith(".html") && (f.includes("netim") || f.includes("yönetim")));
if (!yonetim) {
  console.error("yönetim.html bulunamadı.");
  process.exit(1);
}
const destDir = path.join(cwd, "firebase-public");
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(path.join(cwd, yonetim), path.join(destDir, "index.html"));
const publicDir = path.join(destDir, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
const logoPath = path.join(cwd, "public", "kimgetirdi-logo.png");
if (fs.existsSync(logoPath)) {
  fs.copyFileSync(logoPath, path.join(publicDir, "kimgetirdi-logo.png"));
  console.log("firebase-public/public/kimgetirdi-logo.png kopyalandı");
}
console.log("firebase-public/index.html güncellendi (" + yonetim + ")");
