<template>
  <div class="container py-4">
    <!-- Hero -->
    <section aria-labelledby="home-hero-title" class="row align-items-center g-4">
      <div class="col-lg-6">
        <h1 id="home-hero-title" class="fw-bold">
          A safe, practical space for youth mental wellbeing
        </h1>
        <p class="text-body-secondary">
          Quick reads, urgent help, and a simple layout.
        </p>
        <div class="d-flex flex-wrap gap-2" role="group" aria-label="Primary actions">
          <RouterLink class="btn btn-dark" to="/resources">Explore Resources</RouterLink>
          <RouterLink class="btn btn-outline-dark" to="/get-help">Get Help Now</RouterLink>
        </div>
      </div>

      <div class="col-lg-6">
        <img
          src="/img/four-friends.svg"
          alt="Four teens supporting one another"
          class="img-fluid w-100 rounded-10"
          style="object-fit: contain; height: auto;"
          loading="lazy"
        />
      </div>
    </section>

    <!-- Topics -->
    <section aria-labelledby="topics-title" class="mt-5">
      <h2 id="topics-title" class="h5">Browse by topic</h2>
      <div class="d-flex flex-wrap gap-2" role="group" aria-label="Topic filters">
        <RouterLink
          class="btn btn-sm btn-outline-secondary"
          :to="{ path:'/resources', query:{ q:'anxiety' } }"
        >
          Anxiety
        </RouterLink>
        <RouterLink
          class="btn btn-sm btn-outline-secondary"
          :to="{ path:'/resources', query:{ q:'study' } }"
        >
          Study Stress
        </RouterLink>
        <RouterLink
          class="btn btn-sm btn-outline-secondary"
          :to="{ path:'/resources', query:{ q:'sleep' } }"
        >
          Sleep
        </RouterLink>
        <RouterLink
          class="btn btn-sm btn-outline-secondary"
          :to="{ path:'/resources', query:{ q:'relationships' } }"
        >
          Relationships
        </RouterLink>
      </div>
    </section>

    <!-- Helplines -->
    <section aria-labelledby="helplines-title" class="mt-5">
      <h2 id="helplines-title" class="h5">Helplines &amp; Services</h2>

      <div class="row row-cols-1 row-cols-md-3 g-3">
        <div class="col" v-for="h in helplines" :key="h.name">
          <div class="card h-100" role="group" :aria-label="`${h.name} contact`">
            <div class="card-body d-flex justify-content-between align-items-center">
              <div>
                <h3 class="h6 mb-1">{{ h.name }}</h3>
                <div class="small text-muted">Tap to call · 24/7</div>
              </div>
              <a
                class="btn btn-dark"
                :href="`tel:${h.phone}`"
                :aria-label="`Call ${h.name} on ${formatPhone(h.phone)}`"
              >
                {{ h.phone }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
function formatPhone(p) {
  // Space it a bit for screen readers/visuals: 13 11 14, 1800 55 1800 etc.
  return (p || '').replace(/(\d{2,4})(?=\d)/g, '$1 ');
}

const helplines = [
  { name: 'Lifeline',      phone: '131114' },
  { name: 'Kids Helpline', phone: '1800551800' },
  { name: 'Beyond Blue',   phone: '1300224636' },
]
</script>
