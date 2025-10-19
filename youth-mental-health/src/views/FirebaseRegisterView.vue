<template>
  <section class="section" style="max-width:520px">
    <h1>Create an account</h1>

    <!-- Email registration -->
    <form @submit.prevent="registerEmail" novalidate>
      <p><input class="input" type="text" placeholder="Name (optional)" v-model.trim="name" /></p>
      <p><input class="input" type="email" placeholder="Email" v-model.trim="email" required /></p>
      <p><input class="input" type="password" placeholder="Password (min 6 chars)" v-model="password" required minlength="6" /></p>
      <p><input class="input" type="password" placeholder="Confirm password" v-model="confirm" required /></p>

      <p class="muted" v-if="err" role="alert">{{ err }}</p>

      <p class="cta-row">
        <button class="btn btn-primary" :disabled="busy">Save to Firebase</button>
        <RouterLink class="btn" :to="{ name: 'firebase-signin' }">Have an account? Sign in</RouterLink>
      </p>
    </form>

    <div class="text-center text-muted my-2">or</div>

    <!-- Google "register" (really sign-in + profile bootstrap) -->
    <button class="btn btn-outline-dark w-100" @click="registerGoogle" :disabled="busy">
      <span class="me-2" aria-hidden="true">🔑</span>
      Continue with Google
    </button>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const err = ref('')
const busy = ref(false)

const router = useRouter()
const auth = getAuth()
const db = getFirestore()

function msg(e) {
  const map = {
    'auth/invalid-email': 'Please enter a valid email.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password should be at least 6 characters.',
  }
  return map[e?.code] || e?.message || 'Registration failed.'
}

async function bootstrapProfile(u, fallbackName = '') {
  const display = u.displayName || fallbackName || (u.email?.split('@')[0] || 'User')
  // keep auth displayName in sync if missing
  if (!u.displayName && display) {
    try { await updateProfile(u, { displayName: display }) } catch {}
  }
  await setDoc(
    doc(db, 'users', u.uid),
    {
      name: display,
      email: (u.email || '').toLowerCase(),
      role: 'user',
      createdAt: serverTimestamp(),
    },
    { merge: true }
  )
}

async function registerEmail() {
  try {
    err.value = ''
    if (password.value !== confirm.value) {
      err.value = 'Passwords do not match.'
      return
    }
    busy.value = true

    const cred = await createUserWithEmailAndPassword(
      auth,
      (email.value || '').toLowerCase(),
      password.value
    )

    const display = name.value?.trim() || (cred.user.email?.split('@')[0] || 'User')
    try { await updateProfile(cred.user, { displayName: display }) } catch {}

    await bootstrapProfile(cred.user, display)

    console.log('Firebase Register Successful!', cred.user.uid)
    router.push({ name: 'firebase-signin' })
  } catch (e) {
    console.error(e)
    err.value = msg(e)
  } finally {
    busy.value = false
  }
}

async function registerGoogle() {
  try {
    err.value = ''
    busy.value = true
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const cred = await signInWithPopup(auth, provider)
    await bootstrapProfile(cred.user)
    // after Google “register”, send them in
    router.push('/')
  } catch (e) {
    console.error(e)
    err.value = msg(e)
  } finally {
    busy.value = false
  }
}
</script>
