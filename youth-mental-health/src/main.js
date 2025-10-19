// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { auth, db } from './firebase' // Import from the separate file

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Create Vue app
const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue error]', err, info)
}
app.use(router).mount('#app')

// --- Ensure any registered/logged-in user appears in Firestore ---
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

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