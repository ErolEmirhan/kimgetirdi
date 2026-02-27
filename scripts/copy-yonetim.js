const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const files = fs.readdirSync(cwd);
const yonetim = files.find((f) => f.endsWith(".html") && (f.includes("netim") || f.includes("yönetim")));
const destDir = path.join(cwd, "firebase-public");
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

if (yonetim) {
  fs.copyFileSync(path.join(cwd, yonetim), path.join(destDir, "index.html"));
  console.log("firebase-public/index.html güncellendi (" + yonetim + ")");
} else if (fs.existsSync(path.join(destDir, "index.html"))) {
  console.log("firebase-public/index.html zaten mevcut, doğrudan deploy edilecek.");
} else {
  console.error("yönetim.html veya firebase-public/index.html bulunamadı.");
  process.exit(1);
}

const publicDir = path.join(destDir, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
const logoPath = path.join(cwd, "public", "kimgetirdi-logo.png");
if (fs.existsSync(logoPath)) {
  fs.copyFileSync(logoPath, path.join(publicDir, "kimgetirdi-logo.png"));
  console.log("firebase-public/public/kimgetirdi-logo.png kopyalandı");
}
