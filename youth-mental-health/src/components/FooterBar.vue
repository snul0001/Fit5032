<template>
  <!-- Rendered inside the single footer (role=contentinfo) from App.vue -->
  <div class="bg-light border-top mt-5">
    <div class="container py-4 d-flex flex-wrap gap-3 small">
      <span class="text-muted">© 2025 NFP (demo)</span>
      <a class="link-secondary" href="#">About</a>
      <a class="link-secondary" href="#">Privacy</a>
      <a class="link-secondary" href="#">Terms</a>
      <a class="link-secondary" href="#">Accessibility</a>
      <RouterLink class="link-secondary" to="/contact">Contact</RouterLink>
    </div>
  </div>
</template>

<script setup>
// no script changes
</script>

<style scoped>
/* Fix WCAG AA contrast for links on .bg-light without changing layout */
.link-secondary {
  /* Accessible blue on light gray (≈ #f8f9fa) – contrast > 4.5:1 */
  color: #0a58ca !important;
  text-decoration: underline;
}

.link-secondary:visited {
  color: #0a58ca !important;
}

.link-secondary:hover,
.link-secondary:focus {
  color: #084298 !important; /* darker on hover/focus, still AA */
  text-decoration: underline;
}

/* Keep the muted text readable enough (Bootstrap already OK, but reinforce) */
.text-muted {
  color: #6c757d;
}
</style>
