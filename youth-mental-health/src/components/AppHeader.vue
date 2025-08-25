<template>
  <nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top">
    <div class="container">
      <a class="navbar-brand fw-semibold" href="/">Youth Mental Health</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="nav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item"><RouterLink class="nav-link" to="/">Home</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/resources">Resources</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/get-help">Get Help</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/contact">Contact</RouterLink></li>
        </ul>

        <form class="d-flex" role="search" @submit.prevent="$router.push('/resources')">
          <input v-model="q" class="form-control" type="search" placeholder="Search resources..." />
        </form>
      </div>
    </div>
  </nav>
  <div class="bg-danger-subtle border-top border-bottom border-danger-subtle">
    <div class="container py-2 small">
      <strong>Need help now?</strong>
      <a class="link-danger ms-2" href="tel:000">Call 000</a> ·
      <a class="link-danger" href="tel:131114">Lifeline 13 11 14</a> ·
      <a class="link-danger" href="tel:1800551800">Kids Helpline 1800 55 1800</a>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const q = ref('')
</script>
