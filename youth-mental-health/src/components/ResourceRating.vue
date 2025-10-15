<template>
  <div class="my-3">
    <div class="d-flex align-items-center justify-content-between">
      <div>
        <RatingStars
          :value="myValue"
          :avg="avg"
          :count="count"
          :editable="!!user"
          :disabled="saving"
          aria-label="Rate this resource from 1 to 5"
          @rate="setRating"
        />
        <div class="small text-muted mt-1" v-if="!user">
          <RouterLink :to="{ name: 'firebase-signin', query: { next: returnTo } }">
            Sign in
          </RouterLink>
          to rate.
        </div>
      </div>
      <div class="small">
        <span v-if="saving">Saving…</span>
        <span v-else-if="savedTick">Saved ✓</span>
      </div>
    </div>
    <div class="small text-danger mt-1" v-if="err">{{ err }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import RatingStars from './RatingStars.vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore'

const props = defineProps({ resourceId: { type: String, required: true } })

const route = useRoute()
const returnTo = computed(() => route.fullPath)

const auth = getAuth()
const db = getFirestore()

const user = ref(null)
const myValue = ref(0)
const avg = ref(0)
const count = ref(0)
const saving = ref(false)
const savedTick = ref(false)
const err = ref('')

let stopAuth = null
let unsubAll = null
let unsubMine = null

onMounted(() => {
  stopAuth = onAuthStateChanged(auth, (u) => {
    user.value = u
    watchMyRating()
  })

  const ratingsCol = collection(db, 'resources', props.resourceId, 'ratings')
  unsubAll = onSnapshot(ratingsCol, (snap) => {
    const vals = []
    snap.forEach(d => {
      const v = Number(d.data()?.value)
      if (!isNaN(v)) vals.push(v)
    })
    count.value = vals.length
    avg.value = vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : 0
  }, (e) => { console.error(e); err.value = 'Failed to load ratings.' })
})

onUnmounted(() => {
  stopAuth?.()
  unsubAll?.()
  unsubMine?.()
})

function watchMyRating(){
  unsubMine?.()
  myValue.value = 0
  if (!user.value) return
  const myDocRef = doc(db, 'resources', props.resourceId, 'ratings', user.value.uid)
  unsubMine = onSnapshot(myDocRef, (snap) => {
    myValue.value = Number(snap.data()?.value || 0)
  })
}

async function setRating(v){
  if (!user.value) return
  try {
    saving.value = true
    savedTick.value = false
    err.value = ''
    const myDocRef = doc(db, 'resources', props.resourceId, 'ratings', user.value.uid)
    await setDoc(myDocRef, { value: v, updatedAt: serverTimestamp() }, { merge: true })
    savedTick.value = true
    setTimeout(()=> savedTick.value = false, 1200)
  } catch (e) {
    console.error(e)
    err.value = 'Could not save your rating.'
  } finally {
    saving.value = false
  }
}
</script>
