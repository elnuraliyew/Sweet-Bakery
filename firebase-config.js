// firebase-config.js
// Sweet Bakery üçün rəsmi Firebase konfiqurasiyası

const firebaseConfig = {
  apiKey: "AIzaSyCioyHLLCD1EuErTrAjy0LnKbIqsiYpnF4",
  authDomain: "sweetbakeryweb.firebaseapp.com",
  projectId: "sweetbakeryweb",
  storageBucket: "sweetbakeryweb.firebasestorage.app",
  messagingSenderId: "642206749027",
  appId: "1:642206749027:web:4a74091ebb7eb703728356",
  measurementId: "G-PGD7BR0QTY"
};

// Firebase-i başladırıq
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
