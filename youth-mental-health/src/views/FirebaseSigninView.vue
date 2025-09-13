<template>
  <section class="section" style="max-width:480px">
    <h1>Sign in</h1>

    <form @submit.prevent="signin" novalidate>
      <p><input class="input" type="email" placeholder="Email" v-model.trim="email" required /></p>
      <p><input class="input" type="password" placeholder="Password" v-model="password" required /></p>

      <p class="muted" v-if="err" role="alert">{{ err }}</p>

      <p class="cta-row">
        <button class="btn btn-primary" :disabled="busy">Sign in via Firebase</button>
        <button type="button" class="btn" @click="reset" :disabled="busy || !email">Forgot?</button>
      </p>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'

const email = ref('')
const password = ref('')
const err = ref('')
const busy = ref(false)

const router = useRouter()
const route = useRoute()
const auth = getAuth()

function msg(e) {
  const map = {
    'auth/invalid-email': 'Please enter a valid email.',
    'auth/user-not-found': 'No account with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
  }
  return map[e?.code] || e?.message || 'Sign-in failed.'
}

async function signin() {
  try {
    busy.value = true; err.value = ''
    await signInWithEmailAndPassword(auth, email.value.toLowerCase(), password.value)
    console.log('Signed in:', auth.currentUser)
    router.push(route.query.next || '/')
  } catch (e) {
    err.value = msg(e)
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function reset() {
  try {
    busy.value = true; err.value = ''
    await sendPasswordResetEmail(auth, email.value.toLowerCase())
    err.value = 'Password reset email sent.'
  } catch (e) {
    err.value = msg(e)
  } finally {
    busy.value = false
  }
}
</script>
