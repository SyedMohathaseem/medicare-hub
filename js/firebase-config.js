/* ================================================
   Firebase Configuration
   Replace the placeholder values with your project config
   ================================================ */

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAac1sGu0k6AiGExRzi8YyLP0NDTCErcxk",
  authDomain: "medicare-hub-dfd0c.firebaseapp.com",
  projectId: "medicare-hub-dfd0c",
  storageBucket: "medicare-hub-dfd0c.firebasestorage.app",
  messagingSenderId: "495940083436",
  appId: "1:495940083436:web:79f2ef428d706bc1998fc9",
  measurementId: "G-W25DCRN8RR"
};

// Initialize Firebase
// let db; // Removed to use window.db for global access across files

try {
  // Initialize App
  // Check if firebase is already initialized to avoid errors
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  } else {
    firebase.app(); // if already initialized, use that one
  }
  
  // Initialize Firestore and attach to window
  window.db = firebase.firestore();
  
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
}
