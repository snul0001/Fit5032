<template>
  <div class="d-inline-flex align-items-center">
    <div class="star-row" role="radiogroup" :aria-label="ariaLabel">
      <button
        v-for="i in 5" :key="i"
        class="star-btn"
        :class="{ filled: i <= (hover || value) }"
        :aria-checked="i === value"
        role="radio"
        :disabled="!editable || disabled"
        @mouseenter="hover = i"
        @mouseleave="hover = 0"
        @focus="hover = i"
        @blur="hover = 0"
        @click="$emit('rate', i)"
      >
        <!-- inline SVG star (no external deps) -->
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.168L12 18.896l-7.336 3.869 1.402-8.168L.132 9.21l8.2-1.192z"/>
        </svg>
      </button>
    </div>
    <span v-if="showNumbers" class="ms-2 small text-muted">
      {{ avg.toFixed(1) }} ({{ count }})
    </span>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },       // current user's rating (1..5) or 0
  avg:   { type: Number, default: 0 },       // average for display
  count: { type: Number, default: 0 },       // total ratings
  editable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  showNumbers: { type: Boolean, default: true },
  ariaLabel: { type: String, default: 'Rating' },
})
defineEmits(['rate'])

const hover = ref(0)
</script>

<style scoped>
.star-row { gap: 4px; }
.star-btn {
  border: none; background: transparent; padding: 0; line-height: 0; cursor: pointer;
}
.star-btn[disabled] { cursor: not-allowed; opacity: .5; }
.star-btn svg path { fill: #ddd; transition: fill .12s ease-in-out; }
.star-btn.filled svg path { fill: #f5b301; }
.star-btn:focus-visible { outline: 2px solid #0d6efd; outline-offset: 2px; border-radius: 2px; }
</style>
