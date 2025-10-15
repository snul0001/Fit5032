<template>
  <main class="container py-4">
    <h1 class="mb-3">Manage Resources</h1>

    <div class="mb-2">
      <RouterLink class="btn btn-dark btn-sm" to="/resources/new">+ Add Resource</RouterLink>
    </div>

    <DataTable :columns="cols" :rows="rows">
      <template #cell-topics="{ row }">
        <span class="badge text-bg-secondary me-1" v-for="t in row.topicsArr" :key="t">{{ t }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="d-flex gap-2">
          <RouterLink class="btn btn-sm btn-outline-secondary" :to="`/resources/${row.id}`">Open</RouterLink>
          <RouterLink class="btn btn-sm btn-outline-primary" :to="`/resources/${row.id}/edit`">Edit</RouterLink>
          <button class="btn btn-sm btn-outline-danger" @click="remove(row.id)">Delete</button>
        </div>
      </template>
    </DataTable>

    <p class="text-danger mt-3" v-if="err">{{ err }}</p>
    <p class="text-success mt-3" v-if="ok">Deleted ✓</p>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from '../components/DataTable.vue'
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore'

const db = getFirestore()
const rows = ref([])
const err = ref('')
const ok = ref(false)

const cols = [
  { key: 'title',       label: 'Title' },
  { key: 'readMinutes', label: 'Min',  sortable: true },
  { key: 'topics',      label: 'Topics' },
  { key: 'updatedAt',   label: 'Updated', sortable: true },
  { key: 'actions',     label: 'Actions', searchable: false, sortable: false },
]

onMounted(load)

async function load() {
  err.value = ''; ok.value = false
  try {
    const snap = await getDocs(collection(db, 'resources'))
    rows.value = snap.docs.map(d => {
      const r = d.data()
      const topicsArr = Array.isArray(r.topics) ? r.topics : []
      const ts = r.updatedAt?.toDate?.() || r.createdAt?.toDate?.() || null
      return {
        id: d.id,
        title: r.title || '',
        readMinutes: r.readMinutes ?? '',
        topics: topicsArr.join(', '),
        topicsArr,
        updatedAt: ts ? ts.toLocaleString() : ''
      }
    })
  } catch (e) {
    console.error(e); err.value = 'Failed to load resources.'
  }
}

async function remove(id) {
  if (!confirm('Delete this resource?')) return
  try {
    await deleteDoc(doc(db, 'resources', id))
    rows.value = rows.value.filter(r => r.id !== id)
    ok.value = true; setTimeout(()=> ok.value=false, 1200)
  } catch (e) {
    console.error(e); err.value = 'Delete failed.'
  }
}
</script>
