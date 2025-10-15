<template>
  <main class="container py-4">
    <h1 class="mb-3">Users</h1>

    <DataTable :columns="cols" :rows="rows">
      <template #cell-role="{ row }">
        <span class="badge" :class="row.role==='admin' ? 'text-bg-dark' : 'text-bg-secondary'">
          {{ row.role }}
        </span>
      </template>
    </DataTable>

    <p class="text-danger mt-3" v-if="err">{{ err }}</p>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from '../components/DataTable.vue'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const db = getFirestore()
const rows = ref([])
const err = ref('')

const cols = [
  { key: 'name',      label: 'Name' },
  { key: 'email',     label: 'Email' },
  { key: 'role',      label: 'Role',  sortable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
]

onMounted(load)

async function load() {
  try {
    const snap = await getDocs(collection(db, 'users'))
    rows.value = snap.docs.map(d => {
      const u = d.data()
      const ts = u.createdAt?.toDate?.() || null
      return {
        id: d.id,
        name: u.name || (u.email?.split('@')[0] ?? ''),
        email: (u.email || '').toLowerCase(),
        role: (u.role || 'user').toLowerCase(),
        createdAt: ts ? ts.toLocaleString() : ''
      }
    })
  } catch (e) {
    console.error(e); err.value = 'Failed to load users.'
  }
}
</script>
