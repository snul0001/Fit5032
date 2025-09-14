<template>
  <div class="container py-4" v-if="res">
    <RouterLink to="/resources" class="btn btn-link p-0 mb-2">&lt; Back to resources</RouterLink>

    <h3 class="mb-1">{{ res.title }}</h3>
    <div class="text-muted small mb-2">
      {{ res.readMinutes }} min read · {{ res.topics.join(', ') }}
    </div>

    <!-- ⭐ Rating widget (needs ResourceRating.vue + rules) -->
    <ResourceRating :resource-id="res.id" />

    <p class="lead mt-3">{{ res.summary }}</p>
    <div class="alert alert-info">This is a simple V1 detail page. You can expand with full content later.</div>
  </div>

  <div class="container py-4" v-else>
    <div class="alert alert-warning">Resource not found.</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ResourceRating from '../components/ResourceRating.vue' // <-- add this

const route = useRoute()
const res = ref(null)

onMounted(async () => {
  const data = await (await fetch('/data/resources.json')).json()
  res.value = data.find(x => x.id === route.params.id)
})
</script>
