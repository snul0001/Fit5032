<script setup>
import AppHeader from './components/AppHeader.vue'
import FooterBar from './components/FooterBar.vue'
</script>

<template>
  <!-- Skip link for keyboard users -->
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <!-- Unique banner landmark -->
  <header id="site-header" role="banner" aria-label="Site header" >
    <AppHeader />
  </header>

  <!-- Complementary region for urgent help; clearly labeled -->
  <aside class="urgent-help" role="complementary" aria-label="Urgent help resources">
    <div class="container py-2 small">
      <strong>Need help now?</strong>
      <!-- Use high-contrast link style (urgent-link), not link-danger -->
      <a class="urgent-link ms-2" href="tel:000">Call 000</a> ·
      <a class="urgent-link" href="tel:131114">Lifeline 13 11 14</a> ·
      <a class="urgent-link" href="tel:1800551800">Kids Helpline 1800 55 1800</a>
    </div>
  </aside>

  <!-- Exactly one main landmark -->
  <main id="main-content" role="main" class="main-wrap">
    <RouterView />
  </main>

  <!-- Exactly one top-level contentinfo landmark -->
  <footer id="site-footer" role="contentinfo" aria-label="Site footer">
    <FooterBar />
  </footer>
</template>

<style>
/* Visible when tabbing, hidden otherwise */
.skip-link {
  position: absolute;
  left: -999px;
  top: 0;
  background: #0d6efd;
  color: #fff;
  padding: .5rem .75rem;
  z-index: 10000;
}
.skip-link:focus {
  left: .5rem;
  top: .5rem;
  outline: 3px solid #fff;
}

/* Keep main focusable target clean */
.main-wrap { outline: none; }

/* Urgent banner: solid contrast and clear borders */
.urgent-help {
  background: hsl(0, 87%, 76%);                 /* darker than Bootstrap subtle for better contrast */
  border-top: 1px solid #f5c2c7;
  border-bottom: 1px solid #f5c2c7;
}

/* High-contrast emergency links */
.urgent-link {
  color: #7a0000;                       /* ≥4.5:1 on #FDE7E7 / white */
  font-weight: 600;
  text-decoration: underline;
}
.urgent-link:focus,
.urgent-link:hover {
  color: #520000;
  outline: 2px solid #7a0000;
  outline-offset: 2px;
}

/* Better focus states for all interactive elements */
a:focus-visible, button:focus-visible, .btn:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid #0d6efd;
  outline-offset: 2px;
  border-radius: 3px;
}

html, body, #app { height: 100%; margin: 0; }


/* --- Accessibility: ensure AA contrast for footer links on .bg-light --- */
.bg-light .link-secondary {
  color: #0a58ca !important;        /* AA on #f8f9fa */
  text-decoration: underline;
}
.bg-light .link-secondary:visited {
  color: #0a58ca !important;
}
.bg-light .link-secondary:hover,
.bg-light .link-secondary:focus {
  color: #084298 !important;        /* darker on hover/focus */
  text-decoration: underline;
}

</style>
