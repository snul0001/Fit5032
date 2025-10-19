<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore'

/* Reuse the app initialized in main.js */
const auth = getAuth()
const db = getFirestore()

/* ---------- Auth / Admin gate ---------- */
const authReady = ref(false)
const user = ref(null)
const isAdmin = ref(false)

/* ---------- UI state ---------- */
const tabs = ['Appointments', 'Users', 'Resources']
const currentTab = ref('Appointments')

const allRows = ref([])
const loading = ref(false)
const error = ref('')

const search = ref('')
const sortBy = ref('createdAt')
const sortDir = ref('desc')
const pageSize = 10
const page = ref(1)

/* Summary counts */
const counts = ref({ appointments: 0, users: 0, resources: 0 })

/* Resources columns */
const resourcesColumns = ref({ showTopics: true, showReadingTime: true })

/* Chart elements */
const chartCanvas = ref(null)
const chartTooltip = ref(null)
let chartState = null // { type, labels, series, bars, pie, lines, hoverI, hoverS }

/* ---------- Auth bootstrap ---------- */
onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    user.value = u
    if (!u) { authReady.value = true; return }
    try {
      const udoc = await getDoc(doc(db, 'users', u.uid))
      isAdmin.value = udoc.exists() && (udoc.data().role === 'admin')
    } catch (e) {
      error.value = e.message || 'Failed to read user role'
    } finally {
      authReady.value = true
      if (isAdmin.value) {
        await Promise.all([loadCounts(), loadCurrentTab()])
        await nextTick()
        initChart()
        drawChart()
      }
    }
  })
})

/* ---------- Loaders ---------- */
async function loadCounts() {
  try {
    const [a, u, r] = await Promise.all([
      getDocs(collection(db, 'appointments')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'resources')),
    ])
    counts.value = { appointments: a.size, users: u.size, resources: r.size }
  } catch {}
}

async function loadAppointments() {
  const snap = await getDocs(collection(db, 'appointments'))
  return snap.docs.map(d => {
    const x = d.data()
    return {
      id: d.id,
      title: x.title || 'Untitled',
      start: x.start || null,
      end: x.end || null,
      status: x.status || 'Pending',
      reason: x.reason || '—',
      userName: x.userName || '—',
      counselorName: x.counselorName || '—',
      createdAt: x.createdAt?.toDate ? x.createdAt.toDate() : null,
    }
  })
}
async function loadUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => {
    const x = d.data()
    return {
      id: d.id,
      name: x.name || '—',
      email: x.email || '—',
      role: x.role || 'user',
      createdAt: x.createdAt?.toDate ? x.createdAt.toDate() : null,
    }
  })
}
function coerceTopics(x) {
  if (Array.isArray(x.topics) && x.topics.length) return x.topics
  if (Array.isArray(x.tags) && x.tags.length) return x.tags
  if (x.category) return [x.category]
  return []
}
function coerceReadingTime(x) {
  const rt = x.readingTime ?? x.readTime ?? x.readingMinutes ?? x.minutes
  const n = Number(rt)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}
async function loadResources() {
  const snap = await getDocs(collection(db, 'resources'))
  const rows = snap.docs.map(d => {
    const x = d.data()
    return {
      id: d.id,
      title: x.title || 'Untitled',
      topics: coerceTopics(x),
      readingTime: coerceReadingTime(x),
    }
  })
  resourcesColumns.value = {
    showTopics: rows.some(r => r.topics?.length),
    showReadingTime: rows.some(r => r.readingTime !== null),
  }
  return rows
}

async function loadCurrentTab() {
  if (!isAdmin.value) return
  loading.value = true
  error.value = ''
  try {
    if (currentTab.value === 'Appointments') {
      sortBy.value = 'createdAt'; sortDir.value = 'desc'
      allRows.value = await loadAppointments()
    } else if (currentTab.value === 'Users') {
      sortBy.value = 'createdAt'; sortDir.value = 'desc'
      allRows.value = await loadUsers()
    } else {
      sortBy.value = 'title'; sortDir.value = 'asc'
      allRows.value = await loadResources()
    }
    page.value = 1
    await nextTick()
    initChart()
    drawChart()
  } catch (e) {
    error.value = e.message || 'Failed to load data.'
  } finally {
    loading.value = false
  }
}

/* ---------- Search / sort / pagination ---------- */
const filtered = computed(() => {
  const q = (search.value || '').toLowerCase().trim()
  if (!q) return allRows.value
  if (currentTab.value === 'Appointments') {
    return allRows.value.filter(r =>
      (r.title||'').toLowerCase().includes(q) ||
      (r.userName||'').toLowerCase().includes(q) ||
      (r.counselorName||'').toLowerCase().includes(q) ||
      (r.status||'').toLowerCase().includes(q) ||
      (r.reason||'').toLowerCase().includes(q)
    )
  } else if (currentTab.value === 'Users') {
    return allRows.value.filter(r =>
      (r.name||'').toLowerCase().includes(q) ||
      (r.email||'').toLowerCase().includes(q) ||
      (r.role||'').toLowerCase().includes(q)
    )
  } else {
    return allRows.value.filter(r => {
      const topics = (r.topics || []).join(', ').toLowerCase()
      const rt = r.readingTime ? `${r.readingTime} min` : ''
      return (r.title||'').toLowerCase().includes(q) || topics.includes(q) || rt.includes(q)
    })
  }
})
const sorted = computed(() => {
  const arr = [...filtered.value]
  const key = sortBy.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  arr.sort((a,b) => {
    const av = a[key]; const bv = b[key]
    if (av instanceof Date || bv instanceof Date) {
      const at = av ? av.getTime() : 0
      const bt = bv ? bv.getTime() : 0
      return (at - bt) * dir
    }
    const as = (av ?? '').toString().toLowerCase()
    const bs = (bv ?? '').toString().toLowerCase()
    if (as < bs) return -1 * dir
    if (as > bs) return 1 * dir
    return 0
  })
  return arr
})
const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return sorted.value.slice(start, start + pageSize)
})

/* ---------- Helpers ---------- */
function onSearchInput(){ page.value = 1 }
function changeSort(field){
  if (sortBy.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortBy.value = field
    sortDir.value = ['createdAt','updatedAt','start','readingTime'].includes(field) ? 'desc' : 'asc'
  }
  page.value = 1
}
function nextPage(){
  const max = Math.max(1, Math.ceil(sorted.value.length / pageSize))
  if (page.value < max) page.value++
}
function prevPage(){ if (page.value > 1) page.value-- }
async function switchTab(e){
  currentTab.value = e.target.value
  search.value = ''
  await loadCurrentTab()
}
function formatAU(dt){
  return dt ? dt.toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' }) : '—'
}
function statusClass(s){
  const v = (s||'').toLowerCase()
  if (v.includes('complete')) return 'bg-success-subtle text-success-emphasis border border-success-subtle'
  if (v.includes('cancel'))   return 'bg-danger-subtle text-danger-emphasis border border-danger-subtle'
  if (v.includes('pend'))     return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
  return 'bg-primary-subtle text-primary-emphasis border border-primary-subtle'
}

/* ----- NEW: sort caret helpers (no logic changes) ----- */
function caretFor(field){
  if (sortBy.value !== field) return '↕'
  return sortDir.value === 'asc' ? '▲' : '▼'
}
function ariaSortFor(field){
  if (sortBy.value !== field) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

/* ---------- Charts (Canvas) ---------- */
const chartTitle = computed(() => {
  if (currentTab.value === 'Appointments') return 'Appointments — Bookings per week'
  if (currentTab.value === 'Users')        return 'Users — Signups (last 6 months)'
  return 'Resources — Topics split'
})
const paletteBars = ['#0d6efd','#6f42c1','#20c997','#fd7e14','#198754','#dc3545','#0dcaf0','#ffc107']
const lineColor = '#6f42c1'
const areaFill  = '#e7ddff' // subtle fill under the user line

function initChart(){
  chartState = { type:null, labels:[], series:[], bars:[], pie:[], lines:[], hoverI:-1, hoverS:-1 }
  const c = chartCanvas.value
  if (!c) return
  c.width  = c.clientWidth * devicePixelRatio
  c.height = 300 * devicePixelRatio
}
watch([paged, currentTab, filtered], async () => {
  await nextTick()
  initChart()
  drawChart()
})

function isoWeek(d){
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1))
  const weekNo = Math.ceil((((date - yearStart)/86400000) + 1)/7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`
}

/* === simple weekly booking counts (Appointments) === */
function buildAppointmentsWeeklyCount(){
  const now = new Date()
  const labels = []
  for (let i=5;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i*7); labels.push(isoWeek(d)) }
  const counts = Object.fromEntries(labels.map(k=>[k,0]))
  for (const r of filtered.value){
    const raw = r.createdAt ? r.createdAt : (r.start ? new Date(r.start) : null)
    if (!raw) continue
    const key = isoWeek(raw)
    if (counts[key] != null) counts[key]++
  }
  return { labels, values: labels.map(k=>counts[k]) }
}

function buildUsersMonthly(){
  const now = new Date()
  const labels = []
  for (let i=5;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i, 1); labels.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`) }
  const counts = Object.fromEntries(labels.map(k=>[k,0]))
  for (const r of filtered.value){
    const dt = r.createdAt instanceof Date ? r.createdAt : null
    if (!dt) continue
    const k = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
    if (counts[k]!=null) counts[k]++
  }
  return { labels, values: labels.map(k=>counts[k]) }
}
function buildResourcesTopics(){
  const counts = {}
  for (const r of filtered.value){
    const arr = Array.isArray(r.topics) ? r.topics : []
    if (!arr.length) counts['Uncategorised'] = (counts['Uncategorised']||0)+1
    else for (const t of arr){ const key=String(t||'Uncategorised').trim(); counts[key]=(counts[key]||0)+1 }
  }
  const labels = Object.keys(counts).sort()
  const values = labels.map(l=>counts[l])
  return { labels, values }
}

function drawChart(){
  const c = chartCanvas.value; if (!c) return
  const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height)

  if (currentTab.value === 'Appointments'){
    const { labels, values } = buildAppointmentsWeeklyCount()
    chartState.type='bar'; chartState.labels=labels; chartState.series=[{name:'Bookings', data:values}]
    drawBar(ctx, labels, values, chartTitle.value)
  } else if (currentTab.value === 'Users'){
    const { labels, values } = buildUsersMonthly()
    chartState.type='area'; chartState.labels=labels; chartState.series=[{name:'Signups', data:values}]
    drawArea(ctx, labels, values, chartTitle.value)
  } else {
    const { labels, values } = buildResourcesTopics()
    chartState.type='pie'; chartState.labels=labels; chartState.series=[{name:'Topics', data:values}]
    drawPie(ctx, labels, values, chartTitle.value)
  }
}
function drawTitle(ctx, title){
  ctx.save()
  ctx.fillStyle = '#111'
  ctx.font = `${16*devicePixelRatio}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
  ctx.fillText(title, 16*devicePixelRatio, 26*devicePixelRatio)
  ctx.restore()
}

/* === simple vertical bar chart === */
function drawBar(ctx, labels, values, title){
  drawTitle(ctx, title)
  const top=40*dpr(), bottom=40*dpr(), left=52*dpr(), right=16*dpr()
  const w=ctx.canvas.width-left-right, h=ctx.canvas.height-top-bottom
  const max=Math.max(1,...values)
  const slotW=w/(labels.length||1), barW=slotW*0.6, gap=slotW-barW

  // axes
  ctx.strokeStyle='#e9ecef'; ctx.beginPath()
  ctx.moveTo(left,top); ctx.lineTo(left,top+h); ctx.lineTo(left+w,top+h); ctx.stroke()

  labels.forEach((lab,i)=>{
    const v=values[i]||0
    const barH=(v/max)*h, x=left+i*slotW+gap/2, y=top+h-barH
    ctx.fillStyle=paletteBars[0]
    ctx.fillRect(x,y,barW,barH)
    // label (x-axis)
    ctx.fillStyle='#6c757d'; ctx.textAlign='center'
    ctx.font=`${12*dpr()}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`
    ctx.fillText(lab.replace('W',' W'), left+i*slotW+slotW/2, top+h+16*dpr())
  })
}

function drawArea(ctx, labels, values, title){
  drawTitle(ctx, title)
  const top=40*dpr(), bottom=40*dpr(), left=52*dpr(), right=16*dpr()
  const w=ctx.canvas.width-left-right, h=ctx.canvas.height-top-bottom
  const max=Math.max(1,...values), stepX=w/Math.max(1,labels.length-1)

  // axes
  ctx.strokeStyle='#e9ecef'; ctx.beginPath()
  ctx.moveTo(left,top); ctx.lineTo(left,top+h); ctx.lineTo(left+w,top+h); ctx.stroke()

  // gradient fill
  const grad = ctx.createLinearGradient(0, top, 0, top+h)
  grad.addColorStop(0, areaFill)
  grad.addColorStop(1, '#ffffff')

  // area
  ctx.beginPath()
  values.forEach((v,i)=>{
    const x=left+i*stepX, y=top+h-(v/max)*h
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)
  })
  ctx.lineTo(left+(labels.length-1)*stepX, top+h)
  ctx.lineTo(left, top+h)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()

  // line
  ctx.beginPath()
  values.forEach((v,i)=>{
    const x=left+i*stepX, y=top+h-(v/max)*h
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)
  })
  ctx.strokeStyle=lineColor
  ctx.lineWidth=2*dpr()
  ctx.stroke()

  // points
  ctx.fillStyle='#fff'; ctx.strokeStyle=lineColor
  values.forEach((v,i)=>{
    const x=left+i*stepX, y=top+h-(v/max)*h
    ctx.beginPath(); ctx.arc(x,y,3.5*dpr(),0,Math.PI*2); ctx.fill(); ctx.stroke()
  })

  // labels
  ctx.fillStyle='#6c757d'; ctx.textAlign='center'
  ctx.font=`${12*dpr()}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`
  labels.forEach((lab,i)=> ctx.fillText(lab, left+i*stepX, top+h+16*dpr()))
}
function drawPie(ctx, labels, values, title){
  drawTitle(ctx, title)
  const cx=ctx.canvas.width*0.65, cy=ctx.canvas.height*0.62, r=Math.min(cx,cy)*0.55
  const total=values.reduce((a,b)=>a+b,0)||1
  let start=-Math.PI/2
  chartState.pie=[]
  labels.forEach((lab,i)=>{
    const v=values[i], angle=(v/total)*Math.PI*2, end=start+angle
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath()
    const base=paletteBars[i%paletteBars.length]
    ctx.fillStyle = (chartState.hoverI===i) ? shade(base,-12) : base
    ctx.fill()
    chartState.pie.push({start,end,cx,cy,r})
    start=end
  })
  // legend
  const lx=16*dpr(); let ly=52*dpr()
  ctx.font=`${12*dpr()}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`
  labels.forEach((lab,i)=>{
    const base=paletteBars[i%paletteBars.length]
    ctx.fillStyle=(chartState.hoverI===i)? shade(base,-12) : base
    ctx.fillRect(lx,ly,10*dpr(),10*dpr())
    ctx.fillStyle='#444'
    ctx.fillText(`${lab}: ${values[i]}`, lx+16*dpr(), ly+10*dpr())
    ly+=18*dpr()
  })
}
function dpr(){ return devicePixelRatio }
function shade(hex, pct){
  const num=parseInt(hex.slice(1),16)
  let r=(num>>16)+pct, g=((num>>8)&0xff)+pct, b=(num&0xff)+pct
  r=Math.min(255,Math.max(0,r)); g=Math.min(255,Math.max(0,g)); b=Math.min(255,Math.max(0,b))
  return `#${(r<<16|g<<8|b).toString(16).padStart(6,'0')}`
}

/* Hover tooltips */
function onCanvasMove(e){
  const c=chartCanvas.value, tt=chartTooltip.value; if(!c||!tt||!chartState) return
  const rect=c.getBoundingClientRect(); const x=(e.clientX-rect.left)*dpr(), y=(e.clientY-rect.top)*dpr()
  let label=null, value=null

  if (chartState.type==='area'){
    const top=40*dpr(), bottom=40*dpr(), left=52*dpr(), right=16*dpr()
    const w=c.width-left-right, h=c.height-top-bottom
    const vals=chartState.series[0].data
    const max=Math.max(1,...vals), stepX=w/Math.max(1,chartState.labels.length-1)
    for (let i=0;i<vals.length;i++){
      const px=left+i*stepX, py=top+h-(vals[i]/max)*h
      if (Math.hypot(x-px,y-py) <= 6*dpr()){ chartState.hoverI=i; label=chartState.labels[i]; value=vals[i]; break }
    }
  } else if (chartState.type==='pie'){
    const segs=chartState.pie||[]; const cx=segs[0]?.cx, cy=segs[0]?.cy, r=segs[0]?.r
    const dx=x-cx, dy=y-cy, dist=Math.hypot(dx,dy)
    if (dist<=r){
      let ang=Math.atan2(dy,dx); if (ang<-Math.PI/2) ang+=Math.PI*2
      for (let i=0;i<segs.length;i++){ if(ang>=segs[i].start && ang<=segs[i].end){ chartState.hoverI=i; label=chartState.labels[i]; value=chartState.series[0].data[i]; break } }
    } else chartState.hoverI=-1
  } else if (chartState.type==='bar'){
    // Hit-test bars (same math as drawBar)
    const top=40*dpr(), bottom=40*dpr(), left=52*dpr(), right=16*dpr()
    const w=c.width-left-right, h=c.height-top-bottom
    const vals=chartState.series[0].data
    const max=Math.max(1,...vals)
    const slotW=w/(chartState.labels.length||1), barW=slotW*0.6, gap=slotW-barW
    for (let i=0;i<chartState.labels.length;i++){
      const v=vals[i]||0
      const barH=(v/max)*h, x0=left+i*slotW+gap/2, y0=top+h-barH
      if (x>=x0 && x<=x0+barW && y>=y0 && y<=y0+barH){
        chartState.hoverI=i; label=chartState.labels[i]; value=v; break
      }
    }
  }

  if (label!=null){
    tt.style.display='block'; tt.style.left=e.clientX+10+'px'; tt.style.top=e.clientY+10+'px'
    tt.innerText=`${label}: ${value}`
  } else { tt.style.display='none' }
}
function onCanvasLeave(){ const tt=chartTooltip.value; if(tt) tt.style.display='none'; if(chartState) chartState.hoverI=-1 }
</script>

<template>
  <!-- Hero -->
  <div class="admin-hero shadow-sm mb-4">
    <div class="container py-4 d-flex flex-wrap gap-3 align-items-end">
      <div>
        <h1 class="display-6 m-0 text-white">Admin Dashboard</h1>
      </div>

      <!-- Clean, intuitive dropdown -->
      <div class="ms-auto d-flex align-items-center gap-2">
        <label class="form-label m-0 text-white-75 fw-medium">View</label>
        <div class="select-pill">
          <select :value="currentTab" @change="switchTab" class="select-pill__control" aria-label="Choose dashboard section">
            <option v-for="t in tabs" :key="t" :value="t">{{ t }}</option>
          </select>
          <span class="select-pill__caret">▾</span>
        </div>

        <input
          class="form-control form-control-sm hero-control"
          style="min-width: 240px;"
          type="search"
          v-model="search"
          @input="onSearchInput"
          :placeholder="`Search ${currentTab}…`"
          :aria-label="`Search ${currentTab}`"
        />
      </div>
    </div>
  </div>

  <section class="container">
    <!-- Gate -->
    <div v-if="!authReady" class="alert alert-info shadow-sm rounded-3">Checking your sign-in…</div>
    <div v-else-if="!user" class="alert alert-warning shadow-sm rounded-3">Please sign in to view the admin dashboard.</div>
    <div v-else-if="!isAdmin" class="alert alert-danger shadow-sm rounded-3">You’re signed in but not an admin.</div>

    <template v-if="authReady && user && isAdmin">
      <!-- Stats -->
      <div class="row g-3 mb-3">
        <div class="col-12 col-md-4"><div class="stat-card shadow-sm glass"><div class="stat-label">Appointments</div><div class="stat-value">{{ counts.appointments }}</div></div></div>
        <div class="col-12 col-md-4"><div class="stat-card shadow-sm glass"><div class="stat-label">Users</div><div class="stat-value">{{ counts.users }}</div></div></div>
        <div class="col-12 col-md-4"><div class="stat-card shadow-sm glass"><div class="stat-label">Resources</div><div class="stat-value">{{ counts.resources }}</div></div></div>
      </div>

      <div v-if="error" class="alert alert-danger shadow-sm rounded-3">{{ error }}</div>

      <!-- Chart -->
      <div class="card shadow-sm rounded-4 overflow-hidden mb-3">
        <div class="card-header bg-white"><strong>{{ chartTitle }}</strong></div>
        <div class="card-body chart-body position-relative">
          <canvas ref="chartCanvas" class="chart-canvas" @mousemove="onCanvasMove" @mouseleave="onCanvasLeave"></canvas>
          <div ref="chartTooltip" class="chart-tooltip"></div>
        </div>
      </div>

      <!-- Table -->
      <div class="card shadow-sm rounded-4 overflow-hidden">
        <div class="table-wrap">
          <table class="table table-hover align-middle mb-0">
            <!-- Heads -->
            <thead class="table-sticky" v-if="currentTab === 'Appointments'">
              <tr>
                <th role="button" :aria-sort="ariaSortFor('title')" @click="changeSort('title')">
                  Title <span class="sort-caret">{{ caretFor('title') }}</span>
                </th>
                <th role="button" :aria-sort="ariaSortFor('start')" @click="changeSort('start')">
                  Start <span class="sort-caret">{{ caretFor('start') }}</span>
                </th>
                <th>End</th>
                <th role="button" :aria-sort="ariaSortFor('status')" @click="changeSort('status')">
                  Status <span class="sort-caret">{{ caretFor('status') }}</span>
                </th>
                <th>Reason</th>
                <th role="button" :aria-sort="ariaSortFor('userName')" @click="changeSort('userName')">
                  User <span class="sort-caret">{{ caretFor('userName') }}</span>
                </th>
                <th role="button" :aria-sort="ariaSortFor('counselorName')" @click="changeSort('counselorName')">
                  Counselor <span class="sort-caret">{{ caretFor('counselorName') }}</span>
                </th>
                <th role="button" :aria-sort="ariaSortFor('createdAt')" @click="changeSort('createdAt')">
                  Created <span class="sort-caret">{{ caretFor('createdAt') }}</span>
                </th>
              </tr>
            </thead>

            <thead class="table-sticky" v-else-if="currentTab === 'Users'">
              <tr>
                <th role="button" :aria-sort="ariaSortFor('name')" @click="changeSort('name')">
                  Name <span class="sort-caret">{{ caretFor('name') }}</span>
                </th>
                <th role="button" :aria-sort="ariaSortFor('email')" @click="changeSort('email')">
                  Email <span class="sort-caret">{{ caretFor('email') }}</span>
                </th>
                <th role="button" :aria-sort="ariaSortFor('role')" @click="changeSort('role')">
                  Role <span class="sort-caret">{{ caretFor('role') }}</span>
                </th>
                <th role="button" :aria-sort="ariaSortFor('createdAt')" @click="changeSort('createdAt')">
                  Created <span class="sort-caret">{{ caretFor('createdAt') }}</span>
                </th>
              </tr>
            </thead>

            <thead class="table-sticky" v-else>
              <tr>
                <th role="button" :aria-sort="ariaSortFor('title')" @click="changeSort('title')">
                  Title <span class="sort-caret">{{ caretFor('title') }}</span>
                </th>
                <th v-if="resourcesColumns.showTopics">Topics</th>
                <th v-if="resourcesColumns.showReadingTime" role="button" :aria-sort="ariaSortFor('readingTime')" @click="changeSort('readingTime')">
                  Reading Time <span class="sort-caret">{{ caretFor('readingTime') }}</span>
                </th>
              </tr>
            </thead>

            <!-- Body -->
            <tbody class="table-striped">
              <tr v-if="loading">
                <td :colspan="currentTab==='Appointments'?8:currentTab==='Users'?4:(1+(resourcesColumns.showTopics?1:0)+(resourcesColumns.showReadingTime?1:0))" class="py-5 text-center text-muted">Loading…</td>
              </tr>

              <!-- Appointments -->
              <template v-else-if="currentTab==='Appointments'">
                <tr v-if="paged.length===0"><td colspan="8" class="py-5 text-center text-muted">No appointments found.</td></tr>
                <tr v-for="r in paged" :key="r.id">
                  <td class="fw-medium">{{ r.title }}</td>
                  <td>{{ formatAU(r.start ? new Date(r.start) : null) }}</td>
                  <td>{{ formatAU(r.end ? new Date(r.end) : null) }}</td>
                  <td><span class="badge rounded-pill px-3 py-2 small" :class="statusClass(r.status)">{{ r.status }}</span></td>
                  <td style="max-width:380px;"><span class="text-truncate-2" :title="r.reason">{{ r.reason }}</span></td>
                  <td>{{ r.userName }}</td>
                  <td>{{ r.counselorName }}</td>
                  <td>{{ formatAU(r.createdAt) }}</td>
                </tr>
              </template>

              <!-- Users -->
              <template v-else-if="currentTab==='Users'">
                <tr v-if="paged.length===0"><td colspan="4" class="py-5 text-center text-muted">No users found.</td></tr>
                <tr v-for="r in paged" :key="r.id">
                  <td class="fw-medium">{{ r.name }}</td>
                  <td><small class="text-muted">{{ r.email }}</small></td>
                  <td><span class="badge rounded-pill bg-dark-subtle text-dark-emphasis px-3 py-2 small">{{ r.role }}</span></td>
                  <td>{{ formatAU(r.createdAt) }}</td>
                </tr>
              </template>

              <!-- Resources -->
              <template v-else>
                <tr v-if="paged.length===0"><td :colspan="1+(resourcesColumns.showTopics?1:0)+(resourcesColumns.showReadingTime?1:0)" class="py-5 text-center text-muted">No resources found.</td></tr>
                <tr v-for="r in paged" :key="r.id">
                  <td class="fw-medium">{{ r.title }}</td>
                  <td v-if="resourcesColumns.showTopics">
                    <span v-if="r.topics?.length" class="d-inline-flex flex-wrap gap-1">
                      <span v-for="t in r.topics" :key="t" class="badge rounded-pill bg-primary-subtle text-primary-emphasis border border-primary-subtle">{{ t }}</span>
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td v-if="resourcesColumns.showReadingTime">{{ r.readingTime ? `${r.readingTime} min` : '—' }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center p-3 border-top bg-light-subtle">
          <button class="btn btn-outline-secondary btn-sm" @click="prevPage" :disabled="page<=1">Prev</button>
          <span class="small text-muted">Page {{ page }} of {{ Math.max(1, Math.ceil(sorted.length / pageSize)) }}</span>
          <button class="btn btn-primary btn-sm" @click="nextPage" :disabled="page>=Math.ceil(sorted.length / pageSize)">Next</button>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* Gradient hero */
.admin-hero {
  background: linear-gradient(135deg, #5869ff 0%, #7a52ff 40%, #c96dfa 100%);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
}

/* Pill dropdown (accessible native select, styled) */
.select-pill {
  position: relative;
  display: inline-block;
}
.select-pill__control {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: #fff;
  color: #212529;
  border: 1px solid rgba(0,0,0,.12);
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
  padding: 8px 36px 8px 12px;
  border-radius: 9999px;
  font-size: .95rem;
  line-height: 1.2;
}
.select-pill__control:focus { outline: 3px solid rgba(255,255,255,.75); }
.select-pill__caret {
  position: absolute;
  right: 12px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: #7a52ff; font-weight: 700;
}

.hero-control {
  background: #fff !important;
  color: #212529 !important;
  border: 1px solid rgba(0,0,0,.12) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
  border-radius: 9999px;
}

/* Stats */
.glass { background: rgba(255,255,255,.75); backdrop-filter: blur(6px); }
.stat-card { border-radius: 18px; padding: 18px; border: 1px solid #eef0f6; }
.stat-label { font-size: .85rem; color: #6c757d; margin-bottom: 6px; }
.stat-value { font-size: 1.8rem; font-weight: 700; }

/* Table */
.card { border: 1px solid #eef0f6; }
.table-wrap { width: 100%; overflow: auto; max-height: 60vh; }
.table-sticky th { position: sticky; top: 0; z-index: 2; background: #f8f9fa; border-bottom: 1px solid #e9ecef !important; }
tbody.table-striped tr:nth-child(odd) { background-color: #fcfdff; }
.text-truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
th[role="button"] { cursor: pointer; white-space: nowrap; }
.sort-caret { margin-left: .35rem; font-size: .8em; color: #6c757d; }

/* Charts */
.chart-body { min-height: 300px; background: #fff; }
.chart-canvas { width: 100%; height: 300px; display: block; }
.chart-tooltip {
  position: fixed; z-index: 9999;
  background: rgba(33,37,41,.95); color: #fff; padding: 6px 8px;
  font-size: 12px; border-radius: 6px; pointer-events: none; display: none;
  box-shadow: 0 4px 16px rgba(0,0,0,.2);
}

/* Minor */
.text-white-75 { color: rgba(255,255,255,.85); }
</style>
