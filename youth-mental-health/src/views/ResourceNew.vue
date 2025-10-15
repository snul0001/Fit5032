<template>
  <main class="container py-4" style="max-width:720px">
    <h1>Add Resource</h1>

    <form @submit.prevent="save" novalidate>
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
        <input class="form-control" v-model.trim="topicsRaw" placeholder="Anxiety, Sleep" />
      </div>

      <div class="mb-3">
        <label class="form-label">Content (one paragraph per line)</label>
        <textarea class="form-control" rows="8" v-model.trim="contentRaw"
          placeholder="Paragraph 1...\nParagraph 2..."></textarea>
      </div>

      <div class="d-flex gap-2">
        <button class="btn btn-primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save' }}</button>
        <RouterLink class="btn btn-outline-secondary" to="/resources">Cancel</RouterLink>
      </div>

      <div v-if="err" class="alert alert-danger mt-3" role="alert">{{ err }}</div>
    </form>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const title = ref(''); const summary = ref(''); const readMinutes = ref(3)
const topicsRaw = ref(''); const contentRaw = ref('')
const busy = ref(false); const err = ref('')
const router = useRouter(); const db = getFirestore()

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

async function save(){
  err.value = validate(); if (err.value) return
  busy.value = true
  try {
    const id = crypto.randomUUID()
    await setDoc(doc(db, 'resources', id), {
      title: title.value,
      summary: summary.value,
      readMinutes: readMinutes.value,
      topics: cleanArray(topicsRaw.value ? topicsRaw.value.split(',') : []),
      content: cleanArray(contentRaw.value ? contentRaw.value.split('\n') : []),
      createdAt: serverTimestamp()
    })
    router.push('/resources')
  } catch(e){ console.error(e); err.value = 'Save failed (check auth/rules).' }
  finally { busy.value = false }
}
</script>
