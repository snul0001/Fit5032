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
          <li class="nav-item"><RouterLink class="nav-link" to="/get-help">Get Help</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/contact">Contact</RouterLink></li>
        </ul>

        <!-- Search -->
        <form class="d-flex me-3" role="search" @submit.prevent="onSearch">
          <input v-model="q" class="form-control" type="search" placeholder="Search resources..." />
        </form>

        <!-- Right: auth / greeting -->
        <div class="d-flex align-items-center gap-2">
          <template v-if="user">
            <!-- Admin: greeting is a dropdown toggle -->
            <div v-if="role === 'admin'" class="dropdown">
              <button class="btn btn-link text-decoration-none dropdown-toggle px-0"
                      data-bs-toggle="dropdown" aria-expanded="false"
                      aria-label="Account menu">
                Hi, {{ displayName }} <span class="text-uppercase">({{ role }})</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><RouterLink class="dropdown-item" to="/admin">Dashboard</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/admin/email">Send Email</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/admin/resources-table">Manage Resources</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/admin/users">Users</RouterLink></li>
                <li><hr class="dropdown-divider" /></li>
                <li><button class="dropdown-item" @click="doLogout">Logout</button></li>
              </ul>
            </div>

            <!-- Regular user: plain greeting, separate Logout button -->
            <template v-else>
              <span class="navbar-text small">
                Hi, {{ displayName }} <span class="text-uppercase">({{ role || 'user' }})</span>
              </span>
              <button class="btn btn-outline-secondary btn-sm" @click="doLogout">Logout</button>
            </template>
          </template>

          <!-- Not signed in -->
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const q = ref('')
const router = useRouter()
function onSearch() {
  router.push({ path: '/resources', query: { q: q.value } })
}

const auth = getAuth()
const db = getFirestore()

const user = ref(null)
const displayName = ref('')
const role = ref('') // 'admin' | 'user'

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    user.value = u
    if (!u) { displayName.value = ''; role.value = ''; return }

    displayName.value = u.displayName || u.email?.split('@')[0] || ''
    role.value = 'user'

    const refUser = doc(db, 'users', u.uid)
    try {
      const snap = await getDoc(refUser)
      if (snap.exists()) {
        const data = snap.data() || {}
        const r = String(data.role ?? 'user').toLowerCase()
        role.value = (r === 'admin') ? 'admin' : 'user'

        // ✅ backfill createdAt if missing
        if (!data.createdAt) {
          await setDoc(refUser, { createdAt: serverTimestamp() }, { merge: true })
        }
      } else {
        // ✅ create minimal profile if it's missing (first login via Google/email link, etc.)
        await setDoc(refUser, {
          email: u.email?.toLowerCase() || '',
          name: u.displayName || (u.email?.split('@')[0] || 'User'),
          role: 'user',
          createdAt: serverTimestamp(),
        }, { merge: true })
        role.value = 'user'
      }
    } catch {
      role.value = 'user'
    }
  })
})

async function doLogout() {
  await signOut(auth)
  router.push('/')
}
</script>
