<template>
  <nav
    class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top"
    role="navigation"
    aria-label="Primary"
  >
    <div class="container">
      <RouterLink class="navbar-brand fw-semibold" to="/">Youth Mental Health</RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#nav"
        aria-controls="nav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="nav" class="collapse navbar-collapse">
        <!-- Left: main nav -->
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item"><RouterLink class="nav-link" to="/">Home</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/resources">Resources</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/nearby">Find Help Near Me</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/book">Book Appointment</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/get-help">Get Help</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/contact">Contact</RouterLink></li>
        </ul>

        <!-- Right: auth / greeting -->
        <div class="d-flex align-items-center gap-2">
          <template v-if="user">
            <!-- Admin: greeting is a dropdown toggle -->
            <div v-if="role === 'admin'" class="dropdown">
              <button
                class="btn btn-link text-decoration-none dropdown-toggle px-0"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                aria-label="Account menu"
              >
                Hi, {{ displayName }} <span class="text-uppercase">({{ role }})</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><RouterLink class="dropdown-item" to="/admin">Dashboard</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/admin/email">Send Email</RouterLink></li>
                <li><RouterLink class="dropdown-item" to="/admin/resources-table">Manage Resources</RouterLink></li>
                
                <li><RouterLink class="dropdown-item" to="/admin/export">Export Data</RouterLink></li>
                <li><hr class="dropdown-divider" /></li>
                <li><button class="dropdown-item" @click="doLogout">Logout</button></li>
              </ul>
            </div>

            <!-- Regular user -->
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

        if (!data.createdAt) {
          await setDoc(refUser, { createdAt: serverTimestamp() }, { merge: true })
        }
      } else {
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
