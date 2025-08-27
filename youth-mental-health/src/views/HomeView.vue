<template>
  <div class="container py-4">

    <div class="row align-items-center g-4">
      <div class="col-lg-6">
        <h1 class="fw-bold">A safe, practical space for youth mental wellbeing</h1>
        <p class="text-body-secondary">Quick reads, urgent help, and a simple layout. No accounts. No judgement.</p>
        <div class="d-flex flex-wrap gap-2">
          <RouterLink class="btn btn-dark" to="/resources">Explore Resources</RouterLink>
          <RouterLink class="btn btn-outline-dark" to="/get-help">Get Help Now</RouterLink>
        </div>
      </div>
      <div class="col-lg-6">
        <img
            src="/img/four-friends.svg"
            alt="Teens supporting each other"
            class="img-fluid w-100 rounded-10"
            style="object-fit:contain; height: auto;"
            />

      </div>
    </div>

  
    <h5 class="mt-5">Browse by topic</h5>
    <div class="d-flex flex-wrap gap-2">
      <RouterLink class="btn btn-sm btn-outline-secondary" :to="{path:'/resources', query:{q:'anxiety'}}">Anxiety</RouterLink>
      <RouterLink class="btn btn-sm btn-outline-secondary" :to="{path:'/resources', query:{q:'study'}}">Study Stress</RouterLink>
      <RouterLink class="btn btn-sm btn-outline-secondary" :to="{path:'/resources', query:{q:'sleep'}}">Sleep</RouterLink>
      <RouterLink class="btn btn-sm btn-outline-secondary" :to="{path:'/resources', query:{q:'relationships'}}">Relationships</RouterLink>
    </div>

    
    <h5 class="mt-5">Helplines & Services</h5>
    <div class="row row-cols-1 row-cols-md-3 g-3">
      <div class="col" v-for="h in helplines" :key="h.name">
        <div class="card h-100">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">{{ h.name }}</h6>
              <div class="small text-muted">Tap to call · 24/7</div>
            </div>
            <a class="btn btn-dark" :href="`tel:${h.phone}`">{{ h.phone }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const helplines = [
  { name: 'Lifeline', phone: '131114' },
  { name: 'Kids Helpline', phone: '1800551800' },
  { name: 'Beyond Blue', phone: '1300224636' },
]
</script>
