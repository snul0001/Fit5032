<template>
  <div class="container py-4">
    <h2 class="mb-3">Seed Nearby Services (Admin)</h2>

    <div class="alert alert-warning">
      This will insert sample services into <code>Firestore /services</code>.  
      Run only once. You can delete any duplicates later in Firestore.
    </div>

    <div class="d-flex gap-2">
      <button class="btn btn-primary" :disabled="busy" @click="seed">
        {{ busy ? 'Seeding…' : 'Insert 6 Melbourne services' }}
      </button>
      <button class="btn btn-outline-secondary" :disabled="busy" @click="seedIfEmpty">
        {{ busy ? 'Checking…' : 'Only if collection is empty' }}
      </button>
    </div>

    <p class="mt-3 small text-muted" v-if="msg">{{ msg }}</p>
    <p class="mt-1 small text-danger" v-if="err">{{ err }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore, collection, addDoc, serverTimestamp, getDocs
} from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

const busy = ref(false)
const msg = ref('')
const err = ref('')

// A few realistic Melbourne locations (approx coords)
const samples = [
  {
    name: 'headspace Melbourne',
    category: 'Clinic',
    address: 'Level 2, 401 Swanston St, Melbourne VIC 3000',
    lat: -37.8090, lng: 144.9645,
    phone: '03 9027 0100',
    website: 'https://headspace.org.au/',
    openHours: 'Mon–Fri 9am–5pm'
  },
  {
    name: 'Orygen Youth Health',
    category: 'Support Service',
    address: '35 Poplar Rd, Parkville VIC 3052',
    lat: -37.7819, lng: 144.9388,
    phone: '03 9966 9100',
    website: 'https://www.orygen.org.au/',
    openHours: 'Mon–Fri 9am–5pm'
  },
  {
    name: 'Youth Support + Advocacy Service (YSAS) Fitzroy',
    category: 'Counselling',
    address: '131–133 Nicholson St, Fitzroy VIC 3065',
    lat: -37.8029, lng: 144.9757,
    phone: '03 9415 8881',
    website: 'https://www.ysas.org.au/',
    openHours: 'Mon–Fri 9am–5pm'
  },
  {
    name: 'Head to Health Melbourne',
    category: 'Support Service',
    address: '100 Collins St, Melbourne VIC 3000',
    lat: -37.8145, lng: 144.9720,
    phone: '1800 595 212',
    website: 'https://www.headtohealth.gov.au/',
    openHours: 'Mon–Sun 8am–8pm'
  },
  {
    name: 'The Royal Melbourne Hospital',
    category: 'Hospital',
    address: '300 Grattan St, Parkville VIC 3050',
    lat: -37.7983, lng: 144.9556,
    phone: '03 9342 7000',
    website: 'https://www.thermh.org.au/',
    openHours: '24/7'
  },
  {
    name: 'Kids Helpline (Online)',
    category: 'Support Service',
    address: 'Online / Phone',
    lat: -37.8136, lng: 144.9631, // CBD center as a placeholder
    phone: '1800 55 1800',
    website: 'https://kidshelpline.com.au/',
    openHours: '24/7'
  }
]

// Guard: must be admin (enforced by Firestore rules too)
function assertAdmin(u) {
  if (!u) throw new Error('Sign in as admin to seed.')
}

async function doInsert(set) {
  for (const s of set) {
    await addDoc(collection(db, 'services'), {
      ...s,
      updatedAt: serverTimestamp()
    })
  }
}

async function seed() {
  try {
    busy.value = true; msg.value=''; err.value=''
    const u = auth.currentUser
    assertAdmin(u)
    await doInsert(samples)
    msg.value = `Inserted ${samples.length} services.`
  } catch(e) {
    err.value = e.message || 'Seeding failed.'
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function seedIfEmpty() {
  try {
    busy.value = true; msg.value=''; err.value=''
    const u = auth.currentUser
    assertAdmin(u)
    const snap = await getDocs(collection(db, 'services'))
    if (!snap.empty) {
      msg.value = 'Collection is not empty — nothing inserted.'
      return
    }
    await doInsert(samples)
    msg.value = `Inserted ${samples.length} services (collection was empty).`
  } catch(e) {
    err.value = e.message || 'Seeding failed.'
    console.error(e)
  } finally {
    busy.value = false
  }
}
</script>
