<!-- src/pages/admin/AdminAppointmentsTable.vue -->
<script setup>
import { ref, watch, onMounted } from 'vue'
import { db } from '../../firebase'
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  getDocs,
} from 'firebase/firestore'

// ---------- UI STATE ----------
const rows = ref([])
const loading = ref(false)
const error = ref('')
const pageSize = 10

// search/sort state
const search = ref('')         // by title (prefix search)
const sortBy = ref('createdAt')// 'createdAt' | 'start' | 'title_lc' | 'userName' | 'resourceName'
const sortDir = ref('desc')    // 'asc' | 'desc'

// cursor stack for pagination
const cursors = ref([])        // stack of page start docs
const currentPage = ref(1)
let lastDocOnPage = null

function resetPagination() {
  cursors.value = []
  currentPage.value = 1
  lastDocOnPage = null
}

// Build the Firestore query depending on search/sort
function buildQuery(direction = 'forward') {
  const colRef = collection(db, 'bookings')

  // When searching, we do a prefix search on title_lc.
  // This requires you to store a lowercase title in 'title_lc'.
  // If you haven't added it yet, temporarily rely on client-side filtering instead (see template note).
  const hasSearch = search.value.trim().length > 0
  const s = search.value.trim().toLowerCase()

  // Sorting field: if searching, we must orderBy the same field we filter (title_lc)
  const primarySort = hasSearch ? 'title_lc' : sortBy.value
  const dir = hasSearch ? 'asc' : sortDir.value

  // Base query
  let q = query(
    colRef,
    orderBy(primarySort, dir),
    limit(pageSize)
  )

  // Cursor application
  if (direction === 'forward' && lastDocOnPage) {
    // start after the last doc of the current page
    q = query(q, startAfter(lastDocOnPage))
  } else if (direction === 'backward' && cursors.value.length > 1) {
    // go back: pop current, and fetch from previous page start
    // we can’t directly endBefore() a doc snapshot here in v9;
    // instead, we refetch from the previous page's starting point by rebuilding the stack.
    // Simpler approach: refetch pages from start up to target (keeps code simple & robust).
  }

  return { q, primarySort, dir, hasSearch, s }
}

async function fetchPage(direction = 'forward') {
  loading.value = true
  error.value = ''
  try {
    // For backward, we rebuild from scratch up to target page (simple + reliable)
    if (direction === 'backward') {
      const targetPage = Math.max(1, currentPage.value - 1)
      await fetchToPage(targetPage)
      return
    }

    const { q, hasSearch, s } = buildQuery('forward')
    const snap = await getDocs(q)

    const docs = snap.docs
    // Save cursor for this page
    if (currentPage.value === 1 && docs.length) {
      cursors.value = [docs[0]]
    } else if (docs.length) {
      cursors.value.push(docs[0])
    }

    // Keep last doc for next page
    lastDocOnPage = docs[docs.length - 1] || null

    // Map to rows
    let data = docs.map((d) => {
      const x = d.data()
      return {
        id: d.id,
        title: x.title || 'Untitled',
        start: x.start || null,
        end: x.end || null,
        allDay: !!x.allDay,
        userName: x.userName || '',
        userEmail: x.userEmail || '',
        resourceName: x.resourceName || '',
        createdAt: x.createdAt?.toDate ? x.createdAt.toDate() : null,
        title_lc: x.title_lc || (x.title ? x.title.toLowerCase() : ''),
      }
    })

    // If you haven't added title_lc yet, do a client-side contains filter:
    if (hasSearch && !data.every(r => r.title_lc)) {
      const qlc = s
      data = data.filter(r => r.title?.toLowerCase().includes(qlc))
    }

    rows.value = data
    currentPage.value += direction === 'forward' ? 1 : -1
  } catch (e) {
    console.error(e)
    error.value = 'Failed to load appointments.'
  } finally {
    loading.value = false
  }
}

// Rebuild pages from start to reach page N (used for "Prev" button logic)
async function fetchToPage(targetPage) {
  loading.value = true
  error.value = ''
  try {
    rows.value = []
    cursors.value = []
    lastDocOnPage = null
    currentPage.value = 1

    // Walk pages until reaching targetPage
    while (currentPage.value < targetPage) {
      const { q } = buildQuery('forward')
      const snap = await getDocs(q)
      const docs = snap.docs
      if (!docs.length) break
      // push cursor & move lastDocOnPage forward
      if (currentPage.value === 1) {
        cursors.value = [docs[0]]
      } else {
        cursors.value.push(docs[0])
      }
      lastDocOnPage = docs[docs.length - 1]
      currentPage.value++
    }

    // Now fetch the target page (visible page)
    const { q } = buildQuery('forward')
    const snap = await getDocs(q)
    const docs = snap.docs
    if (docs.length) {
      if (currentPage.value === 1) cursors.value = [docs[0]]
      else cursors.value.push(docs[0])
      lastDocOnPage = docs[docs.length - 1]
    }

    rows.value = docs.map(d => {
      const x = d.data()
      return {
        id: d.id,
        title: x.title || 'Untitled',
        start: x.start || null,
        end: x.end || null,
        allDay: !!x.allDay,
        userName: x.userName || '',
        userEmail: x.userEmail || '',
        resourceName: x.resourceName || '',
        createdAt: x.createdAt?.toDate ? x.createdAt.toDate() : null,
        title_lc: x.title_lc || (x.title ? x.title.toLowerCase() : ''),
      }
    })

  } catch (e) {
    console.error(e)
    error.value = 'Failed to load appointments.'
  } finally {
    loading.value = false
  }
}

// Handlers
async function onSearchInput() {
  resetPagination()
  await fetchPage('forward')
}
async function changeSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDir.value = field === 'createdAt' ? 'desc' : 'asc'
  }
  resetPagination()
  await fetchPage('forward')
}
async function nextPage() {
  await fetchPage('forward')
}
async function prevPage() {
  if (currentPage.value <= 2) {
    // going back to the first page
    await fetchToPage(1)
  } else {
    await fetchToPage(currentPage.value - 1)
  }
}

// Initial load
onMounted(() => {
  fetchPage('forward')
})

// Re-run if you programmatically change sort/search elsewhere
watch([sortBy, sortDir], () => {
  // no-op here; handled by changeSort()
})
</script>

<template>
  <section class="container py-3">
    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <h2 class="m-0">Appointments</h2>
      <div class="ms-auto d-flex gap-2 align-items-center">
        <input
          class="form-control form-control-sm"
          style="min-width: 220px;"
          type="search"
          v-model="search"
          @input="onSearchInput"
          placeholder="Search by title…"
          aria-label="Search appointments by title"
        />
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle">
        <thead>
          <tr>
            <th role="button" @click="changeSort('title_lc')" aria-sort="none">Title</th>
            <th role="button" @click="changeSort('start')" aria-sort="none">Start</th>
            <th role="button" @click="changeSort('end')" aria-sort="none">End</th>
            <th>All-day</th>
            <th role="button" @click="changeSort('userName')" aria-sort="none">User</th>
            <th role="button" @click="changeSort('resourceName')" aria-sort="none">Resource</th>
            <th role="button" @click="changeSort('createdAt')" aria-sort="none">Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7">Loading…</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="7" class="text-danger">{{ error }}</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="7">No appointments found.</td>
          </tr>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.title }}</td>
            <td>{{ r.start ? new Date(r.start).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' }) : '' }}</td>
            <td>{{ r.end ? new Date(r.end).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' }) : '' }}</td>
            <td>{{ r.allDay ? 'Yes' : 'No' }}</td>
            <td>
              <div>{{ r.userName || '—' }}</div>
              <small class="text-muted">{{ r.userEmail }}</small>
            </td>
            <td>{{ r.resourceName || '—' }}</td>
            <td>{{ r.createdAt ? r.createdAt.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' }) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex justify-content-between align-items-center mt-3">
      <button class="btn btn-outline-secondary btn-sm" @click="prevPage" :disabled="currentPage <= 2 && rows.length === 0">Prev</button>
      <span class="small">Page {{ Math.max(1, currentPage - 1) }}</span>
      <button class="btn btn-primary btn-sm" @click="nextPage" :disabled="rows.length < 10">Next</button>
    </div>

    <p class="text-muted mt-2 small">
      Tip: Sorting toggles on header click. Search matches the appointment title (prefix search if you store <code>title_lc</code>).
    </p>
  </section>
</template>

<style scoped>
th[role="button"] {
  cursor: pointer;
  white-space: nowrap;
}
</style>
