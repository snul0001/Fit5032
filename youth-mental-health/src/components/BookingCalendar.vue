<!-- src/components/BookingCalendar.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { db } from '../firebase'

// NEW: import Auth (to get currentUser) + serverTimestamp
import { getAuth } from 'firebase/auth'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  doc,
  serverTimestamp,
} from 'firebase/firestore'

const auth = getAuth()

// ...your existing code (events, listeners, etc.)

// REPLACE your existing createBooking with this one
async function createBooking({ title, start, end, allDay, resourceId, resourceName }) {
  const user = auth.currentUser
  if (!user) {
    alert('Please sign in to create a booking.')
    return
  }

  // IMPORTANT: use the same collection name as your rules.
  // If your rules are for "appointments", use that:
  const col = collection(db, 'bookings')   // ← change to 'bookings' only if your rules use /bookings

  await addDoc(col, {
    title,
    title_lc: (title || '').toLowerCase(),   // for search/sort
    start,                                    // ISO string
    end: end || null,                         // ISO string or null
    allDay: !!allDay,

    // user info (matches rules: userId must equal request.auth.uid)
    userId: user.uid,
    userName: user.displayName || '',
    userEmail: user.email || '',

    // optional resource fields for admin table
    resourceId: resourceId || '',
    resourceName: resourceName || '',

    createdAt: serverTimestamp(),
  })
}

// Example usage (unchanged): called from your date-select handler
async function handleDateSelect(info) {
  const title = window.prompt('Title for this booking?')
  if (!title) return info.view.calendar.unselect()

  await createBooking({
    title,
    start: info.startStr,
    end: info.endStr,
    allDay: info.allDay,
    // resourceId/resourceName if you have a selection UI:
    // resourceId: selectedResourceId,
    // resourceName: selectedResourceName,
  })

  info.view.calendar.unselect()
}
</script>
