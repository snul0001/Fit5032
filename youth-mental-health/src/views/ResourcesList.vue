<template>
  <div class="container py-4">
    <!-- Title row with Export button on the right -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="mb-0">Resources</h1>
      <!-- Public export (everyone) -->
      <RouterLink class="btn btn-outline-primary" to="/export" aria-label="Export resources">
        Export
      </RouterLink>
    </div>

    <!-- Admin toolbar -->
    <div v-if="role === 'admin'" class="mb-3 d-flex gap-2">
      <RouterLink class="btn btn-primary" :to="{ name: 'resource-new' }">+ Add Resource</RouterLink>
      <button class="btn btn-outline-secondary" @click="refresh" :disabled="busy">
        {{ busy ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>

    <!-- Search + chips -->
    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
      <input v-model="q" class="form-control w-100 w-sm-50" placeholder="Search resources..." />
      <div class="ms-auto d-flex flex-wrap gap-2">
        <button
          v-for="t in topics"
          :key="t"
          class="btn btn-sm"
          :class="topic===t ? 'btn-dark' : 'btn-outline-secondary'"
          @click="toggle(t)"
        >
          {{ t }}
        </button>
        <button v-if="topic" class="btn btn-sm btn-outline-secondary" @click="topic=null">Clear</button>
      </div>
    </div>

    <!-- Cards -->
    <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xxl-4 g-3">
      <div class="col" v-for="r in filtered" :key="r.id">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">{{ r.title }}</h6>
            <p class="card-text small text-body-secondary">{{ r.summary }}</p>
            <div class="small text-muted">
              {{ r.readMinutes }} min read
              <span v-if="(r.topics || []).length"> · {{ (r.topics || []).join(', ') }}</span>
            </div>
          </div>
          <div class="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
            <RouterLink class="btn btn-sm btn-outline-dark" :to="`/resources/${r.id}`">Read</RouterLink>
            <div v-if="role === 'admin'" class="d-flex gap-2 small">
              <RouterLink class="link-secondary" :to="{ name: 'resource-edit', params: { id: r.id } }">Edit</RouterLink>
              <button class="btn btn-link p-0" title="Delete" aria-label="Delete"
                      @click="del(r.id)" :disabled="busy">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="filtered.length===0" class="alert alert-secondary mt-3">No results. Try another search or clear the topic.</div>
    <div v-if="error" class="alert alert-danger mt-3" role="alert">{{ error }}</div>
    <div v-if="msg" class="alert alert-info mt-3">{{ msg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, onSnapshot, query, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore'

const items = ref([])
const q = ref('')
const topic = ref(null)
const topics = ["Anxiety","Study Stress","Sleep","Relationships"]
const error = ref('')
const msg = ref('')
const busy = ref(false)

const route = useRoute()
q.value = (route.query.q ?? '').toString()

// role
const role = ref('')
const auth = getAuth()
const db = getFirestore()
let stopAuth = null, unsub = null

onMounted(() => {
  stopAuth = onAuthStateChanged(auth, async (u) => {
    if (!u) { role.value = ''; return }
    try {
      const snap = await getDoc(doc(db, 'users', u.uid))
      role.value = (String(snap.data()?.role || 'user').toLowerCase() === 'admin') ? 'admin' : 'user'
    } catch { role.value = 'user' }
  })

  // live query
  const qcol = query(collection(db, 'resources'), orderBy('createdAt','desc'))
  unsub = onSnapshot(qcol, (snap) => {
    items.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }, (e) => { console.error(e); error.value = 'Failed to load resources.' })
})

onUnmounted(() => { stopAuth?.(); unsub?.() })

const filtered = computed(() => {
  const needle = q.value.toLowerCase()
  return items.value.filter(r => {
    const qok = !needle || (r.title + ' ' + r.summary).toLowerCase().includes(needle)
    const tok = !topic.value || (r.topics || []).includes(topic.value)
    return qok && tok
  })
})

function toggle(t){ topic.value = topic.value===t ? null : t }
function refresh(){ msg.value = 'Refreshed.'; setTimeout(()=>msg.value='', 900) }

async function del(id){
  if (!confirm('Delete this resource?')) return
  try {
    busy.value = true
    await deleteDoc(doc(db, 'resources', id)) // rules enforce admin
    msg.value = 'Deleted.'; setTimeout(()=>msg.value='', 900)
  } catch (e) { console.error(e); error.value = 'Delete failed (check auth/rules).' }
  finally { busy.value = false }
}
</script>
