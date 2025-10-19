<!-- src/views/FirebaseSigninView.vue -->
<template>
  <section class="section" style="max-width:520px">
    <h1>Sign in</h1>

    <!-- Email / password sign in (kept) -->
    <form @submit.prevent="signinEmail" class="mb-3" novalidate>
      <p><input class="input" type="email" placeholder="Email" v-model.trim="email" required /></p>
      <p><input class="input" type="password" placeholder="Password" v-model="password" required /></p>
      <p class="muted" v-if="err" role="alert">{{ err }}</p>
      <p class="cta-row">
        <button class="btn btn-primary" :disabled="busy">Sign in</button>
        <RouterLink class="btn" :to="{ name: 'firebase-register' }">Create account</RouterLink>
      </p>
    </form>

    <div class="text-center text-muted my-2">or</div>

    <!-- Google Sign-In -->
    <button class="btn btn-outline-dark w-100" @click="signinGoogle" :disabled="busy">
      <span class="me-2" aria-hidden="true">🔑</span>
      Continue with Google
    </button>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const auth = getAuth()
const db = getFirestore()

const email = ref('')
const password = ref('')
const err = ref('')
const busy = ref(false)

function dest() {
  // optional redirect support: /firebase-signin?next=/admin
  const next = (route.query.next || '/').toString()
  return next.startsWith('/') ? next : '/'
}

function msg(e) {
  const m = e?.code || e?.message || 'Sign in failed.'
  // simple friendly mapping:
  if (m.includes('wrong-password')) return 'Incorrect email or password.'
  if (m.includes('user-not-found')) return 'No account found for that email.'
  if (m.includes('popup-closed')) return 'Popup closed. Try again.'
  return m
}

async function ensureProfile(u) {
  // make sure a users/{uid} doc exists (needed for role checks)
  const ref = doc(db, 'users', u.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      name: u.displayName || (u.email?.split('@')[0] || 'User'),
      email: (u.email || '').toLowerCase(),
      role: 'user',                 // default role
      createdAt: serverTimestamp()
    }, { merge: true })
  }
}

async function signinEmail() {
  try {
    err.value = ''
    busy.value = true
    const cred = await signInWithEmailAndPassword(auth, (email.value || '').toLowerCase(), password.value)
    await ensureProfile(cred.user)
    router.push(dest())
  } catch (e) {
    err.value = msg(e)
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function signinGoogle() {
  try {
    err.value = ''
    busy.value = true
    const provider = new GoogleAuthProvider()
    // optional: force account selection each time
    provider.setCustomParameters({ prompt: 'select_account' })

    const cred = await signInWithPopup(auth, provider)
    // create profile doc if missing (keeps your role system working)
    await ensureProfile(cred.user)
    router.push(dest())
  } catch (e) {
    err.value = msg(e)
    console.error(e)
  } finally {
    busy.value = false
  }
}
</script>
