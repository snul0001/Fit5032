<template>
  <section class="section" style="max-width:520px">
    <h1>Create an account</h1>

    <form @submit.prevent="register" novalidate>
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
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
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

async function register() {
  try {
    err.value = ''
    if (password.value !== confirm.value) {
      err.value = 'Passwords do not match.'
      return
    }
    busy.value = true

    const cred = await createUserWithEmailAndPassword(
      auth,
      email.value.toLowerCase(),
      password.value
    )

    // Set display name (fallback to email prefix)
    const display = name.value || email.value.split('@')[0]
    await updateProfile(cred.user, { displayName: display })

    // Create profile doc with default role
    await setDoc(
      doc(db, 'users', cred.user.uid),
      {
        name: display,
        email: cred.user.email.toLowerCase(),
        role: 'youth',
        createdAt: serverTimestamp(),
      },
      { merge: true }
    )

    console.log('Firebase Register Successful!', cred.user.uid)
    router.push({ name: 'firebase-signin' }) // safer than hard-coded path
  } catch (e) {
    err.value = msg(e)
    console.error(e)
  } finally {
    busy.value = false
  }
}
</script>
