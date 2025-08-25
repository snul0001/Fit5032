<template>
  <div class="container py-4">
    <div class="alert alert-warning d-flex flex-wrap align-items-center gap-2">
      <strong class="me-2">Are you safe right now?</strong>
      <a class="btn btn-dark btn-sm" href="tel:000">Call 000</a>
      <a class="btn btn-outline-dark btn-sm" href="tel:131114">Lifeline 13 11 14</a>
      <a class="btn btn-outline-dark btn-sm" href="tel:1800551800">Kids Helpline 1800 55 1800</a>
    </div>

    <div class="row g-3">
      <div class="col-lg-8">
        <div class="card" v-for="h in helplines" :key="h.name">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">{{ h.name }}</h6>
              <div class="small text-muted">Tap to call · 24/7</div>
            </div>
            <a class="btn btn-dark" :href="`tel:${h.phone}`">{{ h.phone }}</a>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <h6>When to call vs browse</h6>
            <ul class="small">
              <li>Call if you feel unsafe or at risk</li>
              <li>Call if you need someone now</li>
              <li>Browse resources for tips & planning</li>
            </ul>
            <RouterLink to="/resources" class="btn btn-outline-dark me-2">Browse Resources</RouterLink>
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
