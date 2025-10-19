// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCK2ny8l7EXD15KkFMb0UKrggNlxwHwxDo",
  authDomain: "week7-sriadityanulu.firebaseapp.com",
  projectId: "week7-sriadityanulu",
  storageBucket: "week7-sriadityanulu.firebasestorage.app",
  messagingSenderId: "970607199582",
  appId: "1:970607199582:web:d4bab620bdeef7f1bfbbcf"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
const db = getFirestore(app)
const auth = getAuth(app)

export { db, auth }