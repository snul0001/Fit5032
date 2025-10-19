<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { getAuth } from 'firebase/auth'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getModel } from '../lib/gemini'
import { getContextSnapshots, selectRelevantChunks } from '../lib/searchContent'

const open = ref(false)
const input = ref('')
const messages = ref([
  { role: 'assistant', text: 'Hi! I can answer questions using our site content (resources & services). Ask me anything.' }
])
const thinking = ref(false)
const error = ref('')

const auth = getAuth()
const db = getFirestore()
let ctxCache = null // cached site content for RAG

async function ensureContext() {
  if (!ctxCache) {
    ctxCache = await getContextSnapshots(30) // grab up to 30 each
  }
}

function formatContextForPrompt(q) {
  // select relevant bits
  const picked = selectRelevantChunks(q, ctxCache, 6)
  const resLines = picked.resources.map(r =>
    `- [Resource] ${r.title} ${r.topics?.length ? `(${r.topics.join(', ')})` : ''}${r.readingTime ? ` • ${r.readingTime}min` : ''}\n  Snippet: ${r.snippet}`
  ).join('\n')

  const svcLines = picked.services.map(s =>
    `- [Service] ${s.name}${s.address ? `, ${s.address}` : ''}${s.phone ? `, ${s.phone}` : ''}${s.tags?.length ? ` • tags: ${s.tags.join(', ')}` : ''}`
  ).join('\n')

  return `
You are an assistant embedded in a youth mental health site. Be clear, kind, and practical.
Base your answer primarily on the "SITE CONTEXT" below when relevant. Use bullet points, short paragraphs, and include specific, actionable tips. If you don’t find relevant info, say so briefly and give general best-practice guidance.

SITE CONTEXT (from Firestore):
Resources:
${resLines || '(none matched)'}

Services:
${svcLines || '(none matched)'}

RESPONSE RULES:
- If you cite content, refer to resource titles or service names (no raw URLs needed).
- Keep answers safe and supportive; add "seek urgent help" note if user describes crisis (000 in Australia).
- If the user asks for booking info, mention the appointments feature exists in the site.
- 1–2 short paragraphs + a small checklist is ideal.
  `.trim()
}

async function ask() {
  const q = input.value.trim()
  if (!q) return
  input.value = ''
  error.value = ''
  messages.value.push({ role: 'user', text: q })

  thinking.value = true
  try {
    await ensureContext()
    const systemAndContext = formatContextForPrompt(q)

    const model = getModel()
    const result = await model.generateContent([
      { role: 'user', parts: [{ text: systemAndContext }] },
      { role: 'user', parts: [{ text: q }] }
    ])
    const text = result.response?.text?.() || '(No response)'

    messages.value.push({ role: 'assistant', text })

    // optional: store chat
    const u = auth.currentUser
    try {
      await addDoc(collection(db, 'aiChats'), {
        userId: u?.uid || null,
        createdAt: serverTimestamp(),
        query: q,
        answer: text
      })
    } catch (e) {
      // non-fatal
      console.debug('[aiChats] log skipped', e?.message)
    }
  } catch (e) {
    console.error('[AskAI] error', e)
    error.value = e?.message || 'Something went wrong.'
    messages.value.push({ role: 'assistant', text: 'Oops, I hit an error. Try again in a moment.' })
  } finally {
    thinking.value = false
    await nextTick()
    scrollToBottom()
  }
}

const panel = ref(null)
function scrollToBottom() {
  const el = panel.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

onMounted(() => {
  setTimeout(scrollToBottom, 200)
})
</script>

<template>
  <!-- Floating button -->
  <button class="ai-fab btn btn-primary" @click="open = !open" aria-label="Ask AI">
    <span v-if="!open">Ask AI</span>
    <span v-else>Close</span>
  </button>

  <!-- Drawer -->
  <div class="ai-drawer shadow-lg" :class="{ open }" role="dialog" aria-label="Ask AI panel">
    <div class="ai-header d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-2">
        <div class="ai-dot"></div>
        <strong>Ask AI</strong>
        <span class="text-muted small">powered by Gemini</span>
      </div>
      <button class="btn btn-sm btn-outline-secondary" @click="open=false">✕</button>
    </div>

    <div ref="panel" class="ai-panel">
      <div v-for="(m, i) in messages" :key="i"
           class="ai-msg" :class="m.role">
        <div class="bubble" v-html="m.text.replace(/\n/g,'<br>')"></div>
      </div>
      <div v-if="thinking" class="ai-thinking">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>

    <div class="ai-input">
      <input
        type="text"
        class="form-control"
        v-model="input"
        :placeholder="thinking ? 'Thinking…' : 'Ask about stress, sleep, services…'"
        :disabled="thinking"
        @keydown.enter.prevent="ask"
        aria-label="Type your question"
      />
      <button class="btn btn-primary" :disabled="thinking || !input.trim()" @click="ask">Send</button>
    </div>

    <div v-if="error" class="alert alert-danger m-2">{{ error }}</div>
  </div>
</template>

<style scoped>
/* Floating action button */
.ai-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2100;
  border-radius: 9999px;
  padding: 10px 16px;
  box-shadow: 0 8px 24px rgba(13,110,253,.25);
}

/* Drawer */
.ai-drawer {
  position: fixed;
  right: 16px;
  bottom: 72px;
  width: min(440px, 92vw);
  height: min(70vh, 640px);
  background: #fff;
  border-radius: 16px;
  transform: translateY(16px) scale(.98);
  opacity: 0;
  pointer-events: none;
  transition: .2s ease;
  z-index: 2100;
  display: flex;
  flex-direction: column;
  border: 1px solid #eef0f6;
}
.ai-drawer.open {
  transform: translateY(0) scale(1);
  opacity: 1;
  pointer-events: auto;
}
.ai-header {
  padding: 10px 12px;
  border-bottom: 1px solid #eef0f6;
  background: linear-gradient(180deg, #fafbff, #fff);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}
.ai-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #7a52ff; box-shadow: 0 0 0 3px rgba(122,82,255,.15);
}
.ai-panel {
  flex: 1;
  overflow: auto;
  padding: 12px;
  background: #fafbff;
}
.ai-msg { display: flex; margin: 8px 0; }
.ai-msg.user { justify-content: flex-end; }
.ai-msg .bubble {
  max-width: 80%;
  padding: 10px 12px;
  border-radius: 14px;
  line-height: 1.4;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  word-break: break-word;
}
.ai-msg.user .bubble { background: #0d6efd; color: #fff; border-bottom-right-radius: 4px; }
.ai-msg.assistant .bubble { background: #fff; border: 1px solid #eef0f6; border-bottom-left-radius: 4px; }

.ai-thinking { padding: 8px 12px; display: flex; gap: 4px; }
.dot {
  width: 8px; height: 8px; background: #bbb; border-radius: 50%;
  animation: bounce 1s infinite;
}
.dot:nth-child(2){ animation-delay: .2s }
.dot:nth-child(3){ animation-delay: .4s }
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: .6 }
  40% { transform: translateY(-4px); opacity: 1 }
}

.ai-input {
  display: flex; gap: 8px; padding: 10px; border-top: 1px solid #eef0f6; background: #fff;
  border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;
}
</style>
