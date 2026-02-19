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
console.log("firebase-public/index.html güncellendi (" + yonetim + ")");
