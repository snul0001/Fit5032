<template>
  <main class="container py-4" style="max-width:720px">
    <h1 class="mb-3">Send Email (Admin)</h1>

    <form @submit.prevent="send" novalidate>
      <div class="mb-3">
        <label class="form-label">To (comma-separated)</label>
        <input
          class="form-control"
          v-model.trim="toRaw"
          placeholder="user@example.com, other@school.edu"
          required
        />
      </div>

      <div class="mb-3">
        <label class="form-label">Subject</label>
        <input
          class="form-control"
          v-model.trim="subject"
          required
          maxlength="150"
        />
      </div>

      <div class="mb-3">
        <label class="form-label">Message (text)</label>
        <textarea
          class="form-control"
          rows="6"
          v-model.trim="text"
          placeholder="Write your message…"
        />
      </div>

      <div class="mb-2">
        <label class="form-label">Attachment (optional)</label>
        <input type="file" class="form-control" @change="pickFile" />
      </div>
      <div v-if="fileName" class="small text-muted mb-3">
        Selected: {{ fileName }} ({{ fileType }})
      </div>

      <div class="d-flex gap-2">
        <button class="btn btn-primary" :disabled="busy">
          {{ busy ? 'Sending…' : 'Send' }}
        </button>
        <RouterLink class="btn btn-outline-secondary" to="/">Cancel</RouterLink>
      </div>

      <p class="text-danger mt-3" v-if="err" role="alert">{{ err }}</p>
      <p class="text-success mt-3" v-if="ok">Sent ✓</p>
    </form>
  </main>
</template>

<script setup>
console.log('VITE_SENDMAIL_URL =', import.meta.env.VITE_SENDMAIL_URL)

import { ref } from 'vue'
import { getAuth } from 'firebase/auth'

const toRaw = ref('')
const subject = ref('')
const text = ref('')

const fileName = ref('')
const fileType = ref('')
const fileB64 = ref('')

const busy = ref(false)
const err = ref('')
const ok = ref(false)

function pickFile(e) {
  const f = e.target.files?.[0]
  if (!f) {
    fileName.value = ''
    fileType.value = ''
    fileB64.value = ''
    return
  }
  fileName.value = f.name
  fileType.value = f.type || 'application/octet-stream'

  const reader = new FileReader()
  reader.onload = () => {
    const res = reader.result?.toString() || ''
    const b64 = res.split('base64,')[1] || ''
    fileB64.value = b64
  }
  reader.readAsDataURL(f)
}

async function send() {
  try {
    err.value = ''
    ok.value = false
    busy.value = true

    if (!toRaw.value || !subject.value || !text.value) {
      err.value = 'Please fill To, Subject, and Message.'
      return
    }

    const toList = toRaw.value.split(',').map(s => s.trim()).filter(Boolean)
    if (!toList.length) {
      err.value = 'Please enter at least one recipient.'
      return
    }

    const auth = getAuth()
    const user = auth.currentUser
    if (!user) {
      err.value = 'You must be signed in (admin) to send emails.'
      return
    }
    const token = await user.getIdToken()

    const url = import.meta.env.VITE_SENDMAIL_URL
    if (!url) throw new Error('Missing VITE_SENDMAIL_URL')

    const body = {
      to: toList,
      subject: subject.value, // deref refs
      text: text.value,
      attachments: fileB64.value
        ? [
            {
              filename: fileName.value,
              type: fileType.value,
              content: fileB64.value
            }
          ]
        : []
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(body)
    })

    // Read raw text first; handle non-JSON gracefully
    const raw = await r.text()
    let data = null
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      throw new Error(`Non-JSON response (HTTP ${r.status}): ${raw.slice(0, 200)}`)
    }

    if (!r.ok || !data?.ok) {
      throw new Error(data?.error || `HTTP ${r.status}: ${raw}`)
    }

    ok.value = true
  } catch (e) {
    err.value = e?.message || 'Send failed'
  } finally {
    busy.value = false
  }
}
</script>
