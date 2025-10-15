<template>
  <main class="container py-4">
    <h1 class="mb-3">Admin Dashboard</h1>

    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card p-3">
          <div class="h5 mb-0">{{ resourceCount }}</div>
          <div class="text-muted small">Resources</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card p-3">
          <div class="h5 mb-0">{{ ratingDocs }}</div>
          <div class="text-muted small">Rating entries</div>
        </div>
      </div>
    </div>

    <div class="d-flex gap-2 mb-3">
      <RouterLink class="btn btn-primary" :to="{ name: 'resource-new' }">+ Add Resource</RouterLink>
      <button class="btn btn-outline-secondary" @click="refresh" :disabled="busy">
        {{ busy ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>

    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead><tr><th>Title</th><th>Read min</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="r in resources" :key="r.id">
            <td>{{ r.title }}</td>
            <td>{{ r.readMinutes }}</td>
            <td class="d-flex gap-2">
              <RouterLink class="btn btn-outline-primary btn-sm" :to="{ name: 'resource-edit', params: { id: r.id }}">Edit</RouterLink>
              <button class="btn btn-outline-danger btn-sm" @click="del(r.id)" :disabled="busy">Delete</button>
              <RouterLink class="btn btn-outline-secondary btn-sm" :to="{ name: 'resource-detail', params: { id: r.id }}">View</RouterLink>
            </td>
          </tr>
          <tr v-if="!resources.length"><td colspan="3" class="text-muted">No resources yet.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="err" class="alert alert-danger mt-3" role="alert">{{ err }}</div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getFirestore, collection, getDocs, deleteDoc, doc, getCountFromServer } from 'firebase/firestore'

const db = getFirestore()
const resources = ref([])
const resourceCount = ref(0)
const ratingDocs = ref(0)
const busy = ref(false)
const err = ref('')

async function load() {
  err.value = ''; busy.value = true
  try {
    const snap = await getDocs(collection(db, 'resources'))
    resources.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    resourceCount.value = resources.value.length

    // count all ratings docs (rough—counts per top-level collection group could be used)
    let total = 0
    for (const r of snap.docs) {
      const c = await getCountFromServer(collection(db, 'resources', r.id, 'ratings'))
      total += c.data().count
    }
    ratingDocs.value = total
  } catch (e) { console.error(e); err.value = 'Failed to load dashboard.' }
  finally { busy.value = false }
}
onMounted(load)
function refresh(){ load() }

async function del(id) {
  if (!confirm('Delete this resource?')) return
  try {
    busy.value = true
    await deleteDoc(doc(db, 'resources', id))
    resources.value = resources.value.filter(x => x.id !== id)
    resourceCount.value = resources.value.length
  } catch (e) { console.error(e); err.value = 'Delete failed.' }
  finally { busy.value = false }
}
</script>
