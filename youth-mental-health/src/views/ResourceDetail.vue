<template>
  <div class="container py-4" v-if="res">
    <RouterLink to="/resources" class="btn btn-link p-0 mb-2">&lt; Back to resources</RouterLink>
    <h3 class="mb-1">{{ res.title }}</h3>
    <div class="text-muted small mb-3">{{ res.readMinutes }} min read · {{ res.topics.join(', ') }}</div>
    <p class="lead">{{ res.summary }}</p>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const res = ref(null)
onMounted(async () => {
  const data = await (await fetch('/data/resources.json')).json()
  res.value = data.find(x => x.id === route.params.id)
})
</script>
