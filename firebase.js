// 🔥 Firebase Config File

const firebaseConfig = {
  apiKey: "AIzaSyCUxWOZ3s0J6m6kALZFQSAFPAcslXSx0H8",
  authDomain: "neon-ai-studio.firebaseapp.com",
  projectId: "neon-ai-studio",
  storageBucket: "neon-ai-studio.firebasestorage.app",
  messagingSenderId: "847172575089",
  appId: "1:847172575089:web:2167390c42092c559be0d0",
  measurementId: "G-31LKB4D36Y"
};

// 🔥 Init Firebase
firebase.initializeApp(firebaseConfig);

// 🔐 Auth Export
const auth = firebase.auth();

