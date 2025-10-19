<script setup>
import AppHeader from './components/AppHeader.vue'
import FooterBar from './components/FooterBar.vue'




</script>






<template>
  <!-- src/App.vue -->

  <!-- Skip link for keyboard users -->
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <!-- Landmark: Header (nav is already inside AppHeader) -->
  <header>
    <AppHeader />
    
  </header>

  <!-- Landmark: Urgent help banner should NOT be loose on the page.
       Move it out of AppHeader (see its removal below) and place here
       as a complementary/aside region with a clear label. -->
  <aside class="urgent-help" role="complementary" aria-label="Urgent help resources">
  <div class="bg-danger-subtle border-top border-bottom border-danger-subtle">
    <div class="container py-2 small">
      <strong>Need help now?</strong>
      <a class="link-danger ms-2" href="tel:000">Call 000</a> ·
      <a class="link-danger" href="tel:131114">Lifeline 13 11 14</a> ·
      <a class="link-danger" href="tel:1800551800">Kids Helpline 1800 55 1800</a>
    </div>
  </div>

 
  </aside>

  


  <!-- Landmark: Main content -->
  <main id="main-content" class="main-wrap">
    <RouterView />
  </main>

  <!-- Landmark: Footer -->
  <footer>
    <FooterBar />
  </footer>

  <!-- …your existing App.vue template… -->



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

/* Landmark styling */
.main-wrap { outline: none; }

/* Urgent banner: improve contrast vs light bg */
.urgent-help {
  background: #FDE7E7;                 /* slightly darker than Bootstrap subtle */
  border-top: 1px solid #f5c2c7;
  border-bottom: 1px solid #f5c2c7;
}
.urgent-link {
  color: #7a0000;                       /* ≥4.5:1 contrast on light bg */
  font-weight: 600;
  text-decoration: underline;
}

/* Better focus states for links & buttons */
a:focus-visible, button:focus-visible, .btn:focus-visible, input:focus-visible {
  outline: 2px solid #0d6efd;
  outline-offset: 2px;
  border-radius: 3px;
}

html, body, #app { height: 100%; margin: 0; }
</style>
