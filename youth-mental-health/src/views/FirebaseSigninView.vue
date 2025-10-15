<script setup>
import { ref } from "vue"
import { useRouter, useRoute } from "vue-router"
import {
  getAuth,
  // ✅ ADD:
  setPersistence, browserLocalPersistence,
  signInWithEmailAndPassword,
  // ✅ ADD:
  sendPasswordResetEmail
} from "firebase/auth"

const email = ref("")
const password = ref("")
const err = ref("")           // ✅ ADD (friendly errors)
const busy = ref(false)       // ✅ ADD (button state)
const router = useRouter()
const route = useRoute()
const auth = getAuth()

const signin = async () => {
  try {
    err.value = ""
    busy.value = true
    // ✅ keep users signed in after refresh
    await setPersistence(auth, browserLocalPersistence)
    await signInWithEmailAndPassword(auth, email.value, password.value)
    // optional: redirect to ?next=...
    const next = route.query.next?.toString() || "/"
    router.push(next)
  } catch (e) {
    // ✅ clearer messages
    const map = {
      "auth/invalid-credential": "Invalid email or password.",
      "auth/invalid-email": "Please enter a valid email.",
      "auth/user-disabled": "This account has been disabled.",
      "auth/user-not-found": "No account found with that email.",
      "auth/wrong-password": "Invalid email or password."
    }
    err.value = map[e?.code] || e?.message || "Sign-in failed."
  } finally {
    busy.value = false
  }
}

// ✅ ADD: simple forgot password flow
const forgot = async () => {
  try {
    err.value = ""
    if (!email.value) { err.value = "Enter your email above first."; return }
    busy.value = true
    await sendPasswordResetEmail(auth, email.value)
    err.value = "Password reset email sent."
  } catch (e) {
    err.value = e?.message || "Could not send reset email."
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="container py-4" style="max-width:520px">
    <h1>Sign in</h1>

    <form @submit.prevent="signin" novalidate>
      <p><input type="text" class="form-control" placeholder="Email" v-model="email" /></p>
      <p><input type="password" class="form-control" placeholder="Password" v-model="password" /></p>

      <div class="d-flex gap-2">
        <button class="btn btn-primary" :disabled="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
        <!-- ✅ ADD: forgot button (no page change needed) -->
        <button type="button" class="btn btn-outline-secondary" @click="forgot" :disabled="busy">
          Forgot password
        </button>
      </div>

      <!-- ✅ ADD: friendly feedback area -->
      <p class="text-danger mt-2" v-if="err" role="alert">{{ err }}</p>
    </form>
  </main>
</template>
