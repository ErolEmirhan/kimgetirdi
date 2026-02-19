/**
 * Firebase ayarları — tüm ortamlarda (local + Vercel) buradan okunur.
 * .env.local veya Vercel env kullanmak zorunda değilsin; Firebase Console'dan
 * "Proje ayarları > Genel > Uygulamanız" kısmındaki değerleri buraya yapıştırman yeterli.
 */
export const firebaseConfig = {
  apiKey: "BURAYA_FIREBASE_API_KEY",
  authDomain: "kimgetirdi.firebaseapp.com",
  projectId: "kimgetirdi",
  storageBucket: "kimgetirdi.firebasestorage.app",
  messagingSenderId: "817525082261",
  appId: "BURAYA_FIREBASE_APP_ID",
  measurementId: "BURAYA_MEASUREMENT_ID",
};
