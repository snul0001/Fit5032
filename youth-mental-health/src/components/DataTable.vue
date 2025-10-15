<template>
  <div>
    <!-- Global search -->
    <div class="d-flex justify-content-between align-items-center mb-2">
      <input v-model.trim="globalQ" class="form-control w-50" placeholder="Search all searchable columns…" />
      <div class="small text-muted ms-2">{{ from }}–{{ to }} of {{ total }}</div>
    </div>

    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle">
        <thead>
          <tr>
            <th
              v-for="c in columns" :key="c.key"
              :aria-sort="ariaSort(c)"
              :class="c.sortable !== false ? 'sortable' : ''"
              @click="toggleSort(c)"
              style="white-space:nowrap;cursor:pointer"
            >
              <span class="d-inline-flex align-items-center gap-1">
                {{ c.label }}
                <span class="sort-icon" v-if="c.sortable !== false">
                  <span v-if="sortKey !== c.key">↕</span>
                  <span v-else-if="sortDir === 'asc'">▲</span>
                  <span v-else>▼</span>
                </span>
              </span>
            </th>
          </tr>

          <!-- Per-column search -->
          <tr>
            <th v-for="c in columns" :key="c.key">
              <input v-if="c.searchable !== false"
                     v-model.trim="colFilters[c.key]"
                     class="form-control form-control-sm"
                     :placeholder="`Search ${c.label}`"/>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="r in paged" :key="r.id">
            <td v-for="c in columns" :key="c.key">
              <slot :name="`cell-${c.key}`" :row="r">
                {{ display(r[c.key]) }}
              </slot>
            </td>
          </tr>
          <tr v-if="paged.length === 0">
            <td :colspan="columns.length" class="text-center text-muted py-4">No data.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination (10 per page) -->
    <nav class="d-flex justify-content-between align-items-center">
      <ul class="pagination my-2">
        <li class="page-item" :class="{disabled: page===1}">
          <button class="page-link" @click="go(page-1)">Prev</button>
        </li>
        <li v-for="p in pages" :key="p" class="page-item" :class="{active: page===p}">
          <button class="page-link" @click="go(p)">{{ p }}</button>
        </li>
        <li class="page-item" :class="{disabled: page===pages}">
          <button class="page-link" @click="go(page+1)">Next</button>
        </li>
      </ul>
      <div class="small text-muted">Rows per page: 10</div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },   // [{ key, label, searchable?, sortable? }]
  rows:    { type: Array,  default: () => [] },
})

const pageSize = 10
const page = ref(1)
const globalQ = ref('')
const colFilters = ref(Object.fromEntries((props.columns||[]).map(c => [c.key, ''])))
const sortKey = ref('')
const sortDir = ref('asc')

watch(() => props.rows, () => { page.value = 1 }, { deep: true })

const filtered = computed(() => {
  const q = globalQ.value.toLowerCase()
  const searchKeys = props.columns.filter(c => c.searchable !== false).map(c => c.key)
  return (props.rows || []).filter(r => {
    for (const [k, v] of Object.entries(colFilters.value)) {
      if (!v) continue
      const cell = (r[k] ?? '').toString().toLowerCase()
      if (!cell.includes(v.toLowerCase())) return false
    }
    if (q) {
      const hay = searchKeys.map(k => (r[k] ?? '').toString().toLowerCase()).join(' ')
      if (!hay.includes(q)) return false
    }
    return true
  })
})

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const arr = [...filtered.value]
  const k = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  arr.sort((a, b) => {
    const av = a[k] ?? ''
    const bv = b[k] ?? ''
    if (av == bv) return 0
    return (av > bv ? 1 : -1) * dir
  })
  return arr
})

const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return sorted.value.slice(start, start + pageSize)
})

function toggleSort(c) {
  if (c.sortable === false) return
  if (sortKey.value !== c.key) {
    sortKey.value = c.key
    sortDir.value = 'asc'
  } else {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }
}

function go(p) {
  if (p < 1 || p > pages.value) return
  page.value = p
}

const total = computed(() => sorted.value.length)
const from = computed(() => (sorted.value.length ? (page.value - 1) * pageSize + 1 : 0))
const to   = computed(() => Math.min(page.value * pageSize, sorted.value.length))

function display(v) {
  if (v == null) return ''
  return typeof v === 'string' ? v : String(v)
}

function ariaSort(c) {
  if (c.sortable === false) return 'none'
  if (sortKey.value !== c.key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}
</script>

<style scoped>
.sortable { user-select: none; }
.sort-icon { opacity: .6; font-size: .9em; }
th.sortable:hover .sort-icon { opacity: 1; }
</style>
