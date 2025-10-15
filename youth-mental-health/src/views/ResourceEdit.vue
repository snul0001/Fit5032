<template>
  <main class="container py-4" style="max-width:720px">
    <h1>Edit Resource</h1>

    <form v-if="loaded" @submit.prevent="save" novalidate>
      <div class="mb-3">
        <label class="form-label">Title</label>
        <input class="form-control" v-model.trim="title" maxlength="120" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Summary</label>
        <textarea class="form-control" rows="3" v-model.trim="summary" maxlength="500" required></textarea>
      </div>
      <div class="mb-3">
        <label class="form-label">Read minutes</label>
        <input class="form-control" type="number" min="1" max="60" v-model.number="readMinutes" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Topics (comma-separated)</label>
        <input class="form-control" v-model.trim="topicsRaw" />
      </div>
      <div class="mb-3">
        <label class="form-label">Content (one paragraph per line)</label>
        <textarea class="form-control" rows="8" v-model.trim="contentRaw"></textarea>
      </div>

      <div class="d-flex gap-2">
        <button class="btn btn-primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save changes' }}</button>
        <RouterLink class="btn btn-outline-secondary" to="/resources">Cancel</RouterLink>
      </div>

      <div v-if="err" class="alert alert-danger mt-3" role="alert">{{ err }}</div>
    </form>

    <div v-else class="text-muted">Loading…</div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore'

const route = useRoute(); const router = useRouter()
const db = getFirestore()

const title = ref(''); const summary = ref(''); const readMinutes = ref(3)
const topicsRaw = ref(''); const contentRaw = ref('')
const loaded = ref(false); const busy = ref(false); const err = ref('')

function cleanArray(arr){ return arr.map(s=>s.trim()).filter(Boolean) }
function validate(){
  if (!title.value) return 'Title required'
  if (!summary.value) return 'Summary required'
  if (title.value.length > 120) return 'Max 120 chars'
  if (summary.value.length > 500) return 'Max 500 chars'
  if (readMinutes.value < 1 || readMinutes.value > 60) return 'Read minutes 1–60'
  if (/[<>]/.test(title.value + summary.value + contentRaw.value)) return 'No < or > allowed'
  return ''
}

onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, 'resources', route.params.id))
    if (!snap.exists()) { err.value = 'Resource not found.'; return }
    const d = snap.data()
    title.value = d.title || ''
    summary.value = d.summary || ''
    readMinutes.value = d.readMinutes || 3
    topicsRaw.value = (d.topics || []).join(', ')
    contentRaw.value = (d.content || []).join('\n')
    loaded.value = true
  } catch (e) { console.error(e); err.value = 'Load failed.' }
})

async function save(){
  err.value = validate(); if (err.value) return
  busy.value = true
  try {
    await updateDoc(doc(db, 'resources', route.params.id), {
      title: title.value,
      summary: summary.value,
      readMinutes: readMinutes.value,
      topics: cleanArray(topicsRaw.value ? topicsRaw.value.split(',') : []),
      content: cleanArray(contentRaw.value ? contentRaw.value.split('\n') : [])
    })
    router.push('/resources')
  } catch (e) { console.error(e); err.value = 'Update failed (check auth/rules).' }
  finally { busy.value = false }
}
</script>
