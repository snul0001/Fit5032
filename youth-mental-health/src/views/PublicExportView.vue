<template>
  <div class="container py-4">
    <h1 class="h3 mb-3">Export Resources</h1>

    <div class="alert alert-info" v-if="loading">Loading…</div>
    <div class="alert alert-danger" v-if="err" role="alert">{{ err }}</div>

    <!-- Toolbar -->
    <div class="d-flex flex-wrap gap-2 mb-3" aria-label="Export actions for resources">
      <button class="btn btn-outline-secondary btn-sm" @click="loadResources" :disabled="loading">
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
      <button class="btn btn-dark btn-sm"  @click="dlResCSV"  :disabled="!resources.length" aria-label="Export resources as CSV">Export CSV</button>
      <button class="btn btn-dark btn-sm"  @click="dlResJSON" :disabled="!resources.length" aria-label="Export resources as JSON">Export JSON</button>
      <button class="btn btn-dark btn-sm"  @click="dlResPDF"  :disabled="!resources.length" aria-label="Export resources as PDF">Export PDF</button>
      <span class="small text-muted ms-2 align-self-center">{{ resources.length }} rows</span>
    </div>

    <!-- Table -->
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
          <tr v-if="!loading && !resources.length">
            <td colspan="4" class="text-muted">No data.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const db = getFirestore()

const loading = ref(false)
const err = ref('')
const resources = ref([])

onMounted(loadResources)

async function loadResources () {
  try {
    loading.value = true
    err.value = ''
    const snap = await getDocs(collection(db, 'resources'))
    resources.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error(e)
    err.value = 'Failed to load resources.'
  } finally {
    loading.value = false
  }
}

function fmtTs(ts) {
  try {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString()
  } catch { return '' }
}

function toCSV(rows){
  if (!rows.length) return ''
  const cols = ['id','title','summary','topics','readMinutes','createdAt','updatedAt']
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

function dlResCSV(){ download('resources.csv', 'text/csv;charset=utf-8', toCSV(resources.value)) }
function dlResJSON(){ download('resources.json', 'application/json', JSON.stringify(resources.value, null, 2)) }
function dlResPDF(){
  // simple print-to-PDF via new window
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
  w.document.close()
  w.focus()
  w.print()
}

function safe(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
</script>
