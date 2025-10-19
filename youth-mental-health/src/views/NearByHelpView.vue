<template>
  <div class="container-fluid py-3">
    <div class="row g-3">
      <!-- Left: filters + list -->
      <div class="col-12 col-lg-4">
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex gap-2 flex-wrap">
              <input v-model="q" class="form-control" placeholder="Search name or address…" />
              <button class="btn btn-outline-secondary" @click="locateMe" :disabled="locating">
                {{ locating ? 'Locating…' : 'Use my location' }}
              </button>
              <button class="btn btn-outline-secondary" @click="searchThisArea" :disabled="!mapReady">
                Search this area
              </button>
            </div>

            <div class="mt-2 d-flex flex-wrap gap-2">
              <button
                v-for="c in categories"
                :key="c"
                class="btn btn-sm"
                :class="cat === c ? 'btn-dark' : 'btn-outline-secondary'"
                @click="toggleCategory(c)"
              >
                {{ c }}
              </button>
              <button v-if="cat" class="btn btn-sm btn-outline-secondary" @click="cat=null">Clear</button>
            </div>

            <!-- Nearest street address (from reverse geocode) -->
            <div class="mt-2 small text-muted" v-if="nearestAddress">
              Nearest address: {{ nearestAddress }}
            </div>
          </div>
        </div>

        <div class="list-group small">
          <div v-if="filtered.length === 0" class="alert alert-secondary">
            No places found. Try “Search this area”, change category, or clear the search.
          </div>

          <a
            v-for="s in filtered"
            :key="s.id"
            href="#"
            class="list-group-item list-group-item-action"
            @click.prevent="focusMarker(s)"
          >
            <div class="d-flex justify-content-between align-items-center">
              <strong>{{ s.name }}</strong>
              <span v-if="s._distKm != null" class="badge text-bg-primary">
                {{ s._distKm.toFixed(1) }} km
              </span>
            </div>
            <div class="text-muted">{{ s.address }}</div>
            <div class="mt-1">
              <span class="badge text-bg-light">{{ s.category }}</span>
              <span class="ms-2">{{ s.openHours || '' }}</span>
            </div>
            <div class="mt-2 d-flex gap-2">
              <a
                class="btn btn-sm btn-outline-secondary"
                :href="gmapsUrl(s)"
                target="_blank" rel="noopener"
                @click.stop
              >Get directions</a>
              <a v-if="s.phone" class="btn btn-sm btn-outline-secondary" :href="`tel:${s.phone}`" @click.stop>Call</a>
              <a v-if="s.website" class="btn btn-sm btn-outline-secondary" :href="s.website" target="_blank" rel="noopener" @click.stop>Website</a>
            </div>
          </a>
        </div>
      </div>

      <!-- Right: map -->
      <div class="col-12 col-lg-8">
        <div ref="mapEl" class="map"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const db = getFirestore()

// ========= UI/state =========
const q = ref('')
const cat = ref(null)
const categories = ['Clinic', 'Youth Centre', 'Counselling', 'Hospital', 'Support Service']

const nearestAddress = ref('')        // shows the street address near user/click
const myPos = ref(null)               // { lat, lng }
const locating = ref(false)

const all = ref([])                   // all services from Firestore
const visible = ref([])               // currently within map bounds (or all on first load)
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  return visible.value
    .filter(s => !cat.value || s.category === cat.value)
    .filter(s => {
      if (!term) return true
      const hay = `${s.name} ${s.address}`.toLowerCase()
      return hay.includes(term)
    })
    .sort((a,b) => {
      if (a._distKm != null && b._distKm != null) return a._distKm - b._distKm
      return a.name.localeCompare(b.name)
    })
})

// ========= Map =========
const mapEl = ref(null)
let map
const mapReady = ref(false)
let markers = []

// Streets basemap (MapTiler). Replace KEY with your own if desired.
const MAP_STYLE = 'https://api.maptiler.com/maps/streets-v2/style.json?key=wlKCtG6kEOUdphZDJyJm'

// Helpers
function toRad(x){ return x * Math.PI / 180 }
function haversineKm(a, b) {
  if (!a || !b) return null
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s1 = Math.sin(dLat/2)**2 +
             Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1-s1))
  return R * c
}

function gmapsUrl(s){
  const dest = `${s.lat},${s.lng}`
  const origin = myPos.value ? `${myPos.value.lat},${myPos.value.lng}` : ''
  const base = 'https://www.google.com/maps/dir/?api=1'
  return `${base}&destination=${encodeURIComponent(dest)}${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`
}

function toggleCategory(c){ cat.value = (cat.value === c ? null : c) }

// Accept number, string, or Firestore GeoPoint; return {lat, lng} or null
function coerceLL(d) {
  const lat = d.lat ?? d.location?.latitude ?? d.geo?.latitude
  const lng = d.lng ?? d.location?.longitude ?? d.geo?.longitude
  const nlat = Number(lat)
  const nlng = Number(lng)
  if (Number.isFinite(nlat) && Number.isFinite(nlng)) return { lat: nlat, lng: nlng }
  return null
}

async function loadServices() {
  const snap = await getDocs(collection(db, 'services'))
  const rows = snap.docs.map(doc => {
    const raw = doc.data()
    const ll = coerceLL(raw)
    return ll ? { id: doc.id, ...raw, lat: ll.lat, lng: ll.lng } : null
  }).filter(Boolean)

  console.log('[services] loaded:', rows.length, rows.slice(0, 3))
  all.value = rows

  // First paint: show ALL markers immediately so you see pins right away
  visible.value = [...all.value]
  drawMarkers()
}

function refreshMarkers() {
  if (!map) return
  const b = map.getBounds()

  // Only markers inside current view
  visible.value = all.value.filter(s => {
    return Number.isFinite(s.lat) && Number.isFinite(s.lng) && b.contains([s.lng, s.lat])
  })

  // compute distance if we know user position
  visible.value.forEach(s => {
    s._distKm = myPos.value ? haversineKm(myPos.value, { lat: s.lat, lng: s.lng }) : null
  })

  drawMarkers()
}

function drawMarkers() {
  // clear existing markers
  markers.forEach(m => m.remove())
  markers = []

  if (!visible.value.length) {
    console.log('[services] no markers to draw (check bounds or data)')
    return
  }

  // Use DEFAULT MapLibre pins (easiest to see)
  visible.value.forEach(s => {
    const mk = new maplibregl.Marker() // default blue pin
      .setLngLat([s.lng, s.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 12 }).setHTML(`
          <strong>${escapeHtml(s.name || '')}</strong><br/>
          <span class="text-muted">${escapeHtml(s.address || '')}</span><br/>
          <span>${escapeHtml(s.category || '')}</span><br/>
          <a href="${gmapsUrl(s)}" target="_blank" rel="noopener">Get directions</a>
        `)
      )
      .addTo(map)
    markers.push(mk)
  })

  console.log('[services] drew markers:', markers.length)
}

function focusMarker(s){
  map.flyTo({ center: [s.lng, s.lat], zoom: 14 })
}

function searchThisArea(){
  refreshMarkers()
}

async function locateMe(){
  if (!navigator.geolocation) return
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    async pos => {
      locating.value = false
      myPos.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      map.flyTo({ center: [myPos.value.lng, myPos.value.lat], zoom: 13 })
      nearestAddress.value = await reverseGeocode(myPos.value.lat, myPos.value.lng)
      refreshMarkers()
    },
    () => { locating.value = false },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

// Reverse geocode with Nominatim (no key). Use lightly.
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    const res = await fetch(url, { headers: { 'User-Agent': 'youth-mental-health-demo' } })
    const data = await res.json()
    return data.display_name || ''
  } catch { return '' }
}

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

onMounted(async () => {
  map = new maplibregl.Map({
    container: mapEl.value,
    style: MAP_STYLE,                 // your streets style
    center: [144.9631, -37.8136],     // Melbourne
    zoom: 11
  })
  map.addControl(new maplibregl.NavigationControl(), 'top-right')

  map.on('load', () => {
    mapReady.value = true
    loadServices()
  })
  map.on('moveend', refreshMarkers)
})

onBeforeUnmount(() => {
  markers.forEach(m => m.remove())
  map && map.remove()
})
</script>

<style scoped>
.map { width: 100%; height: 70vh; border-radius: 10px; box-shadow: 0 0 0 1px rgba(0,0,0,.05) }
:deep(.maplibregl-marker) { z-index: 10; }
</style>
