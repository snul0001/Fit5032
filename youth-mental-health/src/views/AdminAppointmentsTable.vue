<template>
  <div class="container py-4">
    <h1 class="mb-3">Appointments (Admin)</h1>

    <div v-if="role !== 'admin'" class="alert alert-warning">
      Admin only. Your role: <strong>{{ role || 'user' }}</strong>
    </div>

    <FullCalendar
      v-if="role === 'admin' && ready"
      :plugins="calendarPlugins"
      :initialView="'timeGridWeek'"
      :slotMinTime="'09:00:00'"
      :slotMaxTime="'18:00:00'"
      :headerToolbar="{ left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,timeGridDay' }"
      :events="events"
      :eventClick="onEventClick"
      :allDaySlot="false"
      height="auto"
    />

    <div v-if="err" class="alert alert-danger mt-3" role="alert">{{ err }}</div>
  </div>
</template>

<script setup>
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { ref, onMounted, onUnmounted } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, onSnapshot, query, orderBy, deleteDoc, doc, getDoc } from 'firebase/firestore'

const calendarPlugins = [dayGridPlugin, timeGridPlugin, interactionPlugin]

const auth = getAuth()
const db = getFirestore()

const role = ref('')
const events = ref([])
const ready = ref(false)
const err = ref('')
let unsub = null

onMounted(() => {
  const stopAuth = onAuthStateChanged(auth, async (u) => {
    if (!u) { role.value = ''; return }
    // read role
    try {
      const snap = await getDoc(doc(db, 'users', u.uid))
      role.value = (snap.exists() && snap.data()?.role === 'admin') ? 'admin' : 'user'
    } catch { role.value = 'user' }

    if (role.value === 'admin') {
      const qcol = query(collection(db, 'appointments'), orderBy('start', 'asc'))
      unsub = onSnapshot(qcol, (snap) => {
        events.value = snap.docs.map(d => {
          const x = d.data()
          return {
            id: d.id,
            title: `${x.title || 'Booked'} — ${x.userName || x.userId?.slice(0,6)}`,
            start: x.start?.toDate ? x.start.toDate() : x.start,
            end:   x.end?.toDate ? x.end.toDate() : x.end
          }
        })
        ready.value = true
      }, (e) => { console.error(e); err.value = 'Failed to load appointments.' })
    }
  })

  onUnmounted(() => {
    unsub?.()
    stopAuth?.()
  })
})

async function onEventClick(arg) {
  if (role.value !== 'admin') return
  if (!confirm('Delete this appointment?')) return
  try {
    await deleteDoc(doc(getFirestore(), 'appointments', arg.event.id))
  } catch (e) {
    console.error(e)
    err.value = 'Delete failed.'
  }
}
</script>
