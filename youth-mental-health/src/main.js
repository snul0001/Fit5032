import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// --- Firebase core ---
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCK2ny8l7EXD15KkFMb0UKrggNlxwHwxDo",
  authDomain: "week7-sriadityanulu.firebaseapp.com",
  projectId: "week7-sriadityanulu",
  storageBucket: "week7-sriadityanulu.firebasestorage.app",
  messagingSenderId: "970607199582",
  appId: "1:970607199582:web:d4bab620bdeef7f1bfbbcf"
}

// Initialize Firebase
initializeApp(firebaseConfig)

// Create Vue app
const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue error]', err, info)
}
app.use(router).mount('#app')

// --- Ensure any registered/logged-in user appears in Firestore ---
// (No timestamps; role defaults to 'user'. You can flip to 'admin' in console.)
const auth = getAuth()
const db = getFirestore()

onAuthStateChanged(auth, async (user) => {
  if (!user) return
  try {
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)

    if (snap.exists()) {
      await setDoc(
        ref,
        {
          email: (user.email || '').toLowerCase(),
          name: user.displayName || (user.email?.split('@')[0] ?? 'User'),
        },
        { merge: true } // <-- DO NOT include `role` here
      )
    } else {
      await setDoc(ref, {
        email: (user.email || '').toLowerCase(),
        name: user.displayName || (user.email?.split('@')[0] ?? 'User'),
        role: 'user', // only on first create
      })
    }
  } catch (e) {
    console.error('[users upsert]', e)
  }
})