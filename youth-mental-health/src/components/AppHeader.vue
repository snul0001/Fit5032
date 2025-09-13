<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
    <div class="container">
      <RouterLink class="navbar-brand fw-semibold" to="/">Youth Mental Health</RouterLink>

      <button class="navbar-toggler" type="button"
              data-bs-toggle="collapse" data-bs-target="#nav"
              aria-controls="nav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="nav" class="collapse navbar-collapse">
        <!-- Left: main nav -->
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item"><RouterLink class="nav-link" to="/">Home</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/resources">Resources</RouterLink></li>
          <li class="nav-item" v-if="canCreate">
            <RouterLink class="nav-link" to="/resources/new">+ Add</RouterLink>
          </li>
          <li class="nav-item"><RouterLink class="nav-link" to="/get-help">Get Help</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/contact">Contact</RouterLink></li>
        </ul>

        <!-- Right: search -->
        <form class="d-flex me-3" role="search" @submit.prevent="onSearch">
          <input v-model="q" class="form-control" type="search" placeholder="Search resources..." />
        </form>

        <!-- Right: auth area -->
        <div class="d-flex align-items-center gap-2">
          <template v-if="user">
            <span class="navbar-text small">
              Hi, {{ displayName }}<span v-if="role"> ({{ role }})</span>
            </span>
            <button class="btn btn-outline-secondary btn-sm" @click="doLogout">Logout</button>
          </template>
          <template v-else>
            <RouterLink class="nav-link" to="/firebase-signin">Sign in</RouterLink>
            <RouterLink class="btn btn-primary btn-sm" to="/firebase-register">Register</RouterLink>
          </template>
        </div>
      </div>
    </div>
  </nav>

  <div class="bg-danger-subtle border-top border-bottom border-danger-subtle">
    <div class="container py-2 small">
      <strong>Need help now?</strong>
      <a class="link-danger ms-2" href="tel:000">Call 000</a> ·
      <a class="link-danger" href="tel:131114">Lifeline 13 11 14</a> ·
      <a class="link-danger" href="tel:1800551800">Kids Helpline 1800 55 1800</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const q = ref('')
const router = useRouter()
function onSearch() {
  router.push({ path: '/resources', query: { q: q.value } })
}

// ---- Firebase auth/role state ----
const auth = getAuth()
const db = getFirestore()

const user = ref(null)
const displayName = ref('')
const role = ref('') // 'youth' | 'editor' | 'admin'

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    user.value = u
    displayName.value = u?.displayName || u?.email?.split('@')[0] || ''
    role.value = ''
    if (u) {
      try {
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) role.value = snap.data().role || ''
      } catch (_) { /* ignore */ }
    }
  })
})

const canCreate = computed(() => user.value && (role.value === 'editor' || role.value === 'admin'))

async function doLogout() {
  await signOut(auth)
  router.push('/')
}
</script>
