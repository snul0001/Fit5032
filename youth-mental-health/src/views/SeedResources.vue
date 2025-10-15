<template>
  <main class="container py-4" style="max-width:860px">
    <h1>Seed Resources (Admin)</h1>
    <p class="text-muted">Paste JSON or use the sample set. Only admins can write.</p>

    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-outline-primary" @click="loadSample">Load sample 10</button>
      <button class="btn btn-primary" :disabled="busy" @click="importJson">
        {{ busy ? 'Importing…' : 'Import JSON → Firestore' }}
      </button>
    </div>

    <textarea class="form-control" rows="14" v-model="jsonText"
      placeholder='[ { "id": "r1", "title": "...", "summary": "...", "readMinutes": 5, "topics": ["Anxiety"], "content": ["para1","para2"] } ]'></textarea>

    <div v-if="msg" class="alert alert-info mt-3">{{ msg }}</div>
    <div v-if="err" class="alert alert-danger mt-3" role="alert">{{ err }}</div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const jsonText = ref('')
const busy = ref(false)
const msg = ref('')
const err = ref('')
const auth = getAuth()
const db = getFirestore()

// gate: only admins should use this
onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (!u) { err.value = 'Sign in as admin to use the seeder.'; return }
    const snap = await (await import('firebase/firestore')).getDoc(
      (await import('firebase/firestore')).doc(db, 'users', u.uid)
    )
    if (snap.exists() && snap.data()?.role === 'admin') return
    err.value = 'You are not an admin.'
  })
})

function loadSample() {
  jsonText.value = JSON.stringify(sampleData, null, 2)
  msg.value = 'Loaded sample set. You can edit before importing.'
}

async function importJson() {
  err.value = ''; msg.value = ''
  let arr
  try {
    arr = JSON.parse(jsonText.value)
    if (!Array.isArray(arr)) throw new Error('JSON must be an array')
  } catch (e) {
    err.value = 'Invalid JSON: ' + e.message
    return
  }
  busy.value = true
  try {
    for (const r of arr) {
      const id = r.id || crypto.randomUUID()
      await setDoc(doc(db, 'resources', id), {
        title: r.title ?? '',
        summary: r.summary ?? '',
        readMinutes: Number(r.readMinutes ?? 3),
        topics: Array.isArray(r.topics) ? r.topics : [],
        content: Array.isArray(r.content) ? r.content : [],
        createdAt: serverTimestamp()
      }, { merge: true })
    }
    msg.value = `Imported ${arr.length} item(s). Go to /resources to see them.`
  } catch (e) {
    console.error(e); err.value = 'Import failed (check rules/auth).'
  } finally {
    busy.value = false
  }
}

// ——— sample 10 articles with content ———
const sampleData = [
  {
    "id":"r1","title":"Managing Exam Stress in 5 Minutes",
    "summary":"Fast calming techniques for the night before an exam.",
    "topics":["Anxiety","Study Stress"],"readMinutes":5,
    "content":[
      "Exam stress is common and fixable in small steps. You don’t need a perfect plan—just a quick reset.",
      "Breathe (1 min): Inhale 4, hold 4, exhale 6. Do 6 cycles to slow your heart rate.",
      "Micro-plan (2 min): Choose one topic. Write 3 tiny tasks. Set a 15-minute timer.",
      "Move (1 min): Stand, roll shoulders 10x, stretch your neck gently.",
      "Reassure (1 min): Tell yourself, “I can do one small thing next.” Then start the timer."
    ]
  },
  {
    "id":"r2","title":"Build a Sleep Wind-Down Routine",
    "summary":"Simple steps to improve sleep this week.","topics":["Sleep"],"readMinutes":6,
    "content":[
      "Your body loves patterns. A short, repeatable wind-down teaches your brain it’s time to sleep.",
      "T-60: Stop caffeine, wrap up screens if you can.",
      "T-30: Dim lights, prep your bag/clothes for tomorrow to reduce mind-spinning.",
      "T-15: Gentle stretches or a warm shower; read a few pages of something chill.",
      "Bed: If thoughts loop, jot 3 bullets: what it is, the first tiny action, and when you’ll do it tomorrow."
    ]
  },
  {
    "id":"r3","title":"What to Say When Overwhelmed",
    "summary":"Tiny scripts for asking for help.","topics":["Relationships","Anxiety"],"readMinutes":4,
    "content":[
      "Asking for help is easier with a script. Keep it short and honest.",
      "To a friend: “I’m feeling overloaded and could use a check-in. 10 minutes to vent?”",
      "To a teacher: “I’m behind and not sure where to start. Could you help me pick the next step?”",
      "To a trusted adult: “I’m not coping well this week. Can we talk tonight or tomorrow?”",
      "If you feel unsafe: call 000 or Lifeline 13 11 14. You’re not alone."
    ]
  },
  {
    "id":"r4","title":"Study in Sprints (Pomodoro)",
    "summary":"Stay focused without burning out.","topics":["Study Stress"],"readMinutes":5,
    "content":[
      "Short, focused bursts beat long, drained sessions.",
      "Plan: 25 minutes work, 5 minutes break. After 4 rounds, take 15–20 minutes off.",
      "Pick one clear task. Turn off notifications. Timer on. Go.",
      "Break: stand up, sip water, stretch. No doomscrolling.",
      "End: write one sentence—what you finished and the next tiny step."
    ]
  },
  {
    "id":"r5","title":"Grounding: 5-4-3-2-1",
    "summary":"Lower anxiety fast anywhere.","topics":["Anxiety"],"readMinutes":3,
    "content":[
      "Grounding brings your mind back to the present when anxiety spikes.",
      "Name 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, 1 you can taste.",
      "Finish with one slow breath and a kind thought: “I’m here. I’m safe enough right now.”"
    ]
  },
  {
    "id":"r6","title":"Better Sleep With Screens",
    "summary":"Reduce blue light and doomscrolling.","topics":["Sleep"],"readMinutes":5,
    "content":[
      "Screens aren’t the enemy; timing is. Shift them earlier and dimmer.",
      "One hour before bed: turn on Night Shift/Blue-light filter; lower brightness.",
      "Move intense chats/games earlier. Swap late scroll for a short podcast or music.",
      "Park your phone out of reach; use a cheap alarm clock if possible."
    ]
  },
  {
    "id":"r7","title":"Handling Group Work Stress",
    "summary":"Roles, standups, shared doc.","topics":["Study Stress","Relationships"],"readMinutes":4,
    "content":[
      "Groups work better when jobs are clear and progress is visible.",
      "Agree roles (lead, researcher, writer, presenter) and due dates.",
      "5-minute standup: yesterday / today / blocker; post notes in a shared doc.",
      "Use a simple Kanban: To-do, Doing, Done. Move cards, not feelings."
    ]
  },
  {
    "id":"r8","title":"Micro-breaks That Help",
    "summary":"90-second reset ideas.","topics":["Anxiety","Study Stress"],"readMinutes":2,
    "content":[
      "Small breaks refresh focus without derailing momentum.",
      "Stand, shoulders back, 5 deep breaths. Drink water.",
      "Look out a window and name 3 shapes. Then return to your task."
    ]
  },
  {
    "id":"r9","title":"Talk to a Trusted Adult",
    "summary":"Plan your first sentence.","topics":["Relationships"],"readMinutes":3,
    "content":[
      "Planning your opener reduces the stress of starting the chat.",
      "Try: “Something’s been heavy lately and I want your advice.”",
      "Ask for a time: “Could we talk for 15 minutes tonight?”",
      "If it’s urgent or you feel unsafe, call 000 / Lifeline 13 11 14."
    ]
  },
  {
    "id":"r10","title":"Sleep Checklist for Students",
    "summary":"Do these 5 things nightly.","topics":["Sleep"],"readMinutes":4,
    "content":[
      "A consistent evening routine adds up fast.",
      "1) Lights dim by 9–10pm. 2) Pack bag. 3) Lay out clothes.",
      "4) Screens down 30–60 min before bed. 5) Same wake time daily.",
      "If sleep is still rough after 2–3 weeks, talk to your GP."
    ]
  }
]
</script>
