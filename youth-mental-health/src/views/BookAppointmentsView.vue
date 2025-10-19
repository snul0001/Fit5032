<template>
  <div class="container py-4">
    <h1 class="mb-3">Book an Appointment</h1>

    <!-- Top controls -->
    <div class="card mb-3">
      <div class="card-body d-flex flex-wrap gap-2 align-items-center">
        <div class="me-2">
          <label class="form-label mb-1">Counselor</label>
          <select v-model="counselorId" class="form-select" aria-label="Select counselor">
            <option disabled value="">Select a counselor</option>
            <option v-for="c in counselors" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div class="me-2">
          <label class="form-label mb-1">Reason (optional)</label>
          <input v-model.trim="reason" class="form-control" placeholder="(Optional) brief note for counselor" />
        </div>

        <div class="ms-auto small text-muted">
          Business hours: Mon–Fri 09:00–17:00 · 30-min slots
        </div>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="err" class="alert alert-danger" role="alert">{{ err }}</div>
    <div v-if="msg" class="alert alert-success" role="status">{{ msg }}</div>

    <!-- Calendar (only YOUR appointments) -->
    <FullCalendar ref="calRef" :options="calendarOptions" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore, collection, onSnapshot, query, where,
  doc, runTransaction, serverTimestamp
} from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

// ---- UI state ----
const user = ref(null)
const displayName = ref('')
const err = ref('')
const msg = ref('')
const reason = ref('')
const counselorId = ref('')

// demo counselor list (could be a Firestore collection)
const counselors = [
  { id: 'c1', name: 'Alex (Counselor)' },
  { id: 'c2', name: 'Sam (Counselor)' },
  { id: 'c3', name: 'Taylor (Counselor)' },
]

// ---- Events for FullCalendar (current user's) ----
const events = ref([])
let stopAuth = null
let unsubAppts = null

onMounted(() => {
  stopAuth = onAuthStateChanged(auth, (u) => {
    user.value = u
    displayName.value = u?.displayName || u?.email?.split('@')[0] || ''

    // Re-subscribe to MY appointments only (rules require this)
    unsubAppts?.()
    events.value = []

    if (u) {
      const qMine = query(collection(db, 'appointments'), where('userId', '==', u.uid))
      unsubAppts = onSnapshot(qMine, (snap) => {
        const arr = []
        snap.forEach(d => {
          const a = d.data()
          arr.push({
            id: d.id,
            title: a.title || a.counselorName || 'Appointment',
            start: a.start, // ISO string OK
            end: a.end,
            extendedProps: a,
          })
        })
        events.value = arr
      }, (e) => { console.error(e); err.value = 'Failed to load your appointments.' })
    }
  })
})

onBeforeUnmount(() => {
  stopAuth?.()
  unsubAppts?.()
})

// ---- Booking flow ----
function lockIdFor(cId, startIso) {
  return `${cId}_${startIso}`
}

async function createBooking({ start, end }) {
  if (!user.value) { err.value = 'Please sign in to book.'; return }
  if (!counselorId.value) { err.value = 'Please select a counselor.'; return }

  err.value = ''
  msg.value = ''

  const startIso = toIso(start)
  const endIso = toIso(end)
  const lockId = lockIdFor(counselorId.value, startIso)

  try {
    await runTransaction(db, async (tx) => {
      const lockRef = doc(db, 'appointmentLocks', lockId)
      const lockSnap = await tx.get(lockRef)
      if (lockSnap.exists()) {
        throw new Error('That slot was just taken. Please pick another time.')
      }

      const apptRef = doc(collection(db, 'appointments'))
      tx.set(apptRef, {
        userId: user.value.uid,
        userName: displayName.value,
        userEmail: user.value.email || '',
        counselorId: counselorId.value,
        counselorName: counselors.find(c => c.id === counselorId.value)?.name || 'Counselor',
        title: `${displayName.value} with ${counselors.find(c => c.id === counselorId.value)?.name || 'Counselor'}`,
        start: startIso,
        end: endIso,
        reason: reason.value || '',
        createdAt: serverTimestamp(),
        status: 'booked'
      })

      tx.set(lockRef, {
        counselorId: counselorId.value,
        start: startIso,
        end: endIso,
        createdAt: serverTimestamp(),
        by: user.value.uid
      })
    })

    msg.value = 'Booked! You’ll see it appear on your calendar.'
    setTimeout(() => msg.value = '', 1800)
  } catch (e) {
    console.error(e)
    err.value = e.message || 'Booking failed.'
  }
}

// ---- Calendar options ----
const calRef = ref(null)
const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridWeek,dayGridMonth'
  },
  height: 'auto',
  slotDuration: '00:30:00',
  slotMinTime: '09:00:00',
  slotMaxTime: '17:00:00',
  businessHours: {
    daysOfWeek: [1,2,3,4,5], // Mon–Fri
    startTime: '09:00',
    endTime: '17:00'
  },
  selectable: true,
  selectMirror: true,
  select: (info) => {
    const start = roundTo30(info.start)
    const end = new Date(start.getTime() + 30*60000)
    const ok = confirm(`Book ${fmt(start)}–${fmt(end)} with ${labelCounselor()}?`)
    if (ok) createBooking({ start, end })
  },
  eventOverlap: false,
  events: (fetchInfo, success) => {
    success(events.value) // only this user's events
  }
}

// ---- Helpers ----
function roundTo30(d) {
  const x = new Date(d)
  x.setSeconds(0,0)
  const m = x.getMinutes()
  x.setMinutes(m < 30 ? 0 : 30)
  return x
}
function pad(n){ return n < 10 ? '0'+n : ''+n }
function toIso(d) {
  const y = d.getFullYear()
  const m = pad(d.getMonth()+1)
  const day = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  return `${y}-${m}-${day}T${hh}:${mm}:00`
}
function fmt(d){
  return d.toLocaleString([], {weekday:'short', hour: '2-digit', minute: '2-digit', hour12:false, month:'short', day:'numeric'})
}
function labelCounselor(){
  return counselors.find(c => c.id === counselorId.value)?.name || '(no counselor)'
}
</script>

<style scoped>
:deep(.fc) {
  --fc-border-color: rgba(0,0,0,.08);
  --fc-today-bg-color: rgba(13,110,253,.06);
}
</style>
