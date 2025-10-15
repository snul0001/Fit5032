<template>
  <div class="container py-4" v-if="res">
    <RouterLink to="/resources" class="btn btn-link p-0 mb-2">&lt; Back to resources</RouterLink>

    <h3 class="mb-1">{{ res.title }}</h3>
    <div class="text-muted small mb-2">
      {{ res.readMinutes }} min read
      <span v-if="(res.topics || []).length"> · {{ (res.topics || []).join(', ') }}</span>
    </div>

    <!-- Admin quick edit -->
    <RouterLink
      v-if="role === 'admin'"
      class="btn btn-outline-primary btn-sm me-2"
      :to="{ name: 'resource-edit', params: { id: res.id } }"
    >Edit</RouterLink>

    <!-- ⭐ Ratings -->
    <ResourceRating :resource-id="res.id" />

    <p class="lead mt-3">{{ res.summary }}</p>

    <section class="mt-3" v-if="(res.content || []).length">
      <p v-for="(p, i) in res.content" :key="i">{{ p }}</p>
    </section>
  </div>

  <div class="container py-4" v-else>
    <div class="alert alert-warning">Resource not found.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import ResourceRating from '../components/ResourceRating.vue'

const route = useRoute()
const res = ref(null)
const role = ref('')

const auth = getAuth()
const db = getFirestore()

let stopAuth = null

onMounted(async () => {
  // Load resource by id from Firestore
  const snap = await getDoc(doc(db, 'resources', route.params.id))
  res.value = snap.exists() ? { id: snap.id, ...snap.data() } : null

  // Watch auth for admin Edit button
  stopAuth = onAuthStateChanged(auth, async (u) => {
    if (!u) { role.value = ''; return }
    try {
      const usnap = await getDoc(doc(db, 'users', u.uid))
      role.value = (usnap.data()?.role === 'admin') ? 'admin' : 'user'
    } catch { role.value = 'user' }
  })
})

onUnmounted(() => stopAuth?.())
</script>
