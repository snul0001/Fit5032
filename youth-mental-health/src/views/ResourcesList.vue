<template>
  <div class="container py-4">

    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
      <input v-model="q" class="form-control w-100 w-sm-50" placeholder="Search resources..." />
      <div class="ms-auto d-flex flex-wrap gap-2">
        <button v-for="t in topics" :key="t"
          class="btn btn-sm"
          :class="topic===t ? 'btn-dark' : 'btn-outline-secondary'"
          @click="toggle(t)">{{ t }}</button>
        <button v-if="topic" class="btn btn-sm btn-outline-secondary" @click="topic=null">Clear</button>
      </div>
    </div>


    <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xxl-4 g-3">
      <div class="col" v-for="r in filtered" :key="r.id">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">{{ r.title }}</h6>
            <p class="card-text small text-body-secondary">{{ r.summary }}</p>
            <div class="small text-muted">{{ r.readMinutes }} min read · {{ r.topics.join(', ') }}</div>
          </div>
          <div class="card-footer bg-transparent border-0">
            <RouterLink class="btn btn-sm btn-outline-dark w-100" :to="`/resources/${r.id}`">Read</RouterLink>
          </div>
        </div>
      </div>
    </div>


    <div v-if="filtered.length===0" class="alert alert-secondary mt-3">No results. Try another search or clear the topic.</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const items = ref([])
const q = ref('')
const topic = ref(null)
const topics = ["Anxiety","Study Stress","Sleep","Relationships"]

const route = useRoute()

onMounted(async () => {
  const res = await fetch('/data/resources.json')
  items.value = await res.json()
  q.value = (route.query.q ?? '').toString()
})

watch(() => route.query.q, (val) => { q.value = (val ?? '').toString() })

const filtered = computed(() => {
  return items.value.filter(r => {
    const qok = !q.value || (r.title + ' ' + r.summary).toLowerCase().includes(q.value.toLowerCase())
    const tok = !topic.value || r.topics.includes(topic.value)
    return qok && tok
  })
})

function toggle(t){ topic.value = topic.value===t ? null : t }
</script>
