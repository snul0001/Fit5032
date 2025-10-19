<template>
  <div class="container py-4">
    <h1 class="h3 mb-3">Admin Export</h1>

    <div class="alert alert-info" v-if="loading">Loading…</div>
    <div class="alert alert-danger" v-if="err" role="alert">{{ err }}</div>

    <!-- RESOURCES (everyone) -->
    <section class="mb-5" aria-labelledby="res-title">
      <h2 id="res-title" class="h5">Resources</h2>
      <div class="d-flex flex-wrap gap-2 mb-2">
        <button class="btn btn-outline-secondary btn-sm" @click="loadResources" :disabled="busyRes">
          {{ busyRes ? 'Refreshing…' : 'Refresh' }}
        </button>
        <button class="btn btn-dark btn-sm" @click="dlResCSV"  :disabled="!resources.length">Export CSV</button>
        <button class="btn btn-dark btn-sm" @click="dlResJSON" :disabled="!resources.length">Export JSON</button>
        <button class="btn btn-dark btn-sm" @click="dlResPDF"  :disabled="!resources.length">Export PDF</button>
        <span class="small text-muted ms-2 align-self-center">{{ resources.length }} rows</span>
      </div>

      <div class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Topics</th>
              <th scope="col">Read (min)</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in resources" :key="r.id">
              <td>{{ r.title }}</td>
              <td>{{ (r.topics || []).join(', ') }}</td>
              <td>{{ r.readMinutes ?? '' }}</td>
              <td>{{ fmtTs(r.updatedAt || r.createdAt) }}</td>
            </tr>
            <tr v-if="!busyRes && !resources.length">
              <td colspan="4" class="text-muted">No data.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- USERS (admin-only) -->
    <section aria-labelledby="users-title">
      <h2 id="users-title" class="h5">Users (admin only)</h2>

      <div v-if="!isAdmin" class="alert alert-secondary">You must be an admin to export users.</div>

      <template v-else>
        <div class="d-flex flex-wrap gap-2 mb-2">
          <button class="btn btn-outline-secondary btn-sm" @click="loadUsers" :disabled="busyUsers">
            {{ busyUsers ? 'Refreshing…' : 'Refresh' }}
          </button>
          <button class="btn btn-dark btn-sm" @click="dlUsersCSV"  :disabled="!users.length">Export CSV</button>
          <button class="btn btn-dark btn-sm" @click="dlUsersJSON" :disabled="!users.length">Export JSON</button>
          <button class="btn btn-dark btn-sm" @click="dlUsersPDF"  :disabled="!users.length">Export PDF</button>
          <span class="small text-muted ms-2 align-self-center">{{ users.length }} rows</span>
        </div>

        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th scope="col">UID</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td class="text-monospace">{{ u.id }}</td>
                <td>{{ u.name || '' }}</td>
                <td>{{ u.email || '' }}</td>
                <td><span class="badge" :class="u.role==='admin' ? 'text-bg-dark' : 'text-bg-secondary'">{{ u.role }}</span></td>
                <td>{{ fmtTs(u.createdAt) }}</td>
              </tr>
              <tr v-if="!busyUsers && !users.length">
                <td colspan="5" class="text-muted">No data or insufficient permissions.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

const loading = ref(false)
const err = ref('')
const isAdmin = ref(false)

const resources = ref([])
const users = ref([])

const busyRes = ref(false)
const busyUsers = ref(false)

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    loading.value = true
    err.value = ''
    try {
      await loadResources()
      isAdmin.value = await checkAdmin(u)
      if (isAdmin.value) await loadUsers()
    } catch (e) {
      console.error(e); err.value = 'Failed to load data.'
    } finally {
      loading.value = false
    }
  })
})

async function checkAdmin(u){
  if (!u) return false
  try {
    const snap = await getDoc(doc(db, 'users', u.uid))
    const role = String(snap.data()?.role || 'user').toLowerCase()
    return role === 'admin'
  } catch { return false }
}

async function loadResources(){
  try {
    busyRes.value = true
    const snap = await getDocs(collection(db, 'resources'))
    resources.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } finally { busyRes.value = false }
}

async function loadUsers(){
  try {
    busyUsers.value = true
    const snap = await getDocs(collection(db, 'users'))
    users.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } finally { busyUsers.value = false }
}

function fmtTs(ts) {
  try {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString()
  } catch { return '' }
}

function toCSV(rows, cols){
  if (!rows.length) return ''
  const esc = v => {
    if (v == null) return ''
    if (Array.isArray(v)) v = v.join('; ')
    if (v?.toDate) v = v.toDate().toISOString()
    v = String(v)
    return /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v
  }
  const header = cols.join(',')
  const body = rows.map(r => cols.map(c => esc(r[c])).join(',')).join('\n')
  return header + '\n' + body
}

function download(filename, mime, content){
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click()
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove() }, 0)
}

/* Resources exports */
function dlResCSV(){ download('resources.csv', 'text/csv;charset=utf-8',
  toCSV(resources.value, ['id','title','summary','topics','readMinutes','createdAt','updatedAt'])) }
function dlResJSON(){ download('resources.json', 'application/json', JSON.stringify(resources.value, null, 2)) }
function dlResPDF(){
  const w = window.open('', '_blank')
  const rows = resources.value.map(r => `
    <tr>
      <td>${safe(r.title)}</td>
      <td>${safe((r.topics||[]).join(', '))}</td>
      <td>${safe(r.readMinutes)}</td>
      <td>${safe(fmtTs(r.updatedAt || r.createdAt))}</td>
    </tr>
  `).join('')
  w.document.write(`<!doctype html><title>Resources Export</title>
  <style>body{font-family:system-ui,Arial,sans-serif} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px} th{background:#f8f9fa}</style>
  <h1>Resources</h1>
  <table><thead><tr><th>Title</th><th>Topics</th><th>Read (min)</th><th>Updated</th></tr></thead><tbody>${rows}</tbody></table>`)
  w.document.close(); w.focus(); w.print()
}

/* Users exports (admin) */
function dlUsersCSV(){ download('users.csv', 'text/csv;charset=utf-8',
  toCSV(users.value, ['id','name','email','role','createdAt'])) }
function dlUsersJSON(){ download('users.json', 'application/json', JSON.stringify(users.value, null, 2)) }
function dlUsersPDF(){
  const w = window.open('', '_blank')
  const rows = users.value.map(u => `
    <tr>
      <td class="mono">${safe(u.id)}</td>
      <td>${safe(u.name)}</td>
      <td>${safe(u.email)}</td>
      <td>${safe(u.role)}</td>
      <td>${safe(fmtTs(u.createdAt))}</td>
    </tr>
  `).join('')
  w.document.write(`<!doctype html><title>Users Export</title>
  <style>body{font-family:system-ui,Arial,sans-serif} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px} th{background:#f8f9fa} .mono{font-family:ui-monospace,Menlo,Consolas,monospace}</style>
  <h1>Users</h1>
  <table><thead><tr><th>UID</th><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr></thead><tbody>${rows}</tbody></table>`)
  w.document.close(); w.focus(); w.print()
}

function safe(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
</script>
