<template>
  <div class="container py-4">
    <h3>Contact</h3>
    <form class="needs-validation" novalidate @submit.prevent="onSubmit" :class="{'was-validated': tried}">
      <div class="mb-3">
        <label class="form-label">Email *</label>
        <input v-model="email" type="email" class="form-control" required />
        <div class="invalid-feedback">Enter a valid email address.</div>
      </div>
      <div class="mb-3">
        <label class="form-label">Message *</label>
        <textarea v-model="msg" class="form-control" minlength="10" maxlength="500" required rows="4"></textarea>
        <div class="invalid-feedback">Message must be at least 10 characters.</div>
        <div class="form-text">{{ msg.length }}/500</div>
      </div>
      <button class="btn btn-dark" type="submit">Send</button>
    </form>
    <div v-if="sent" class="alert alert-success mt-3">Thanks! We’ll get back to you.</div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const email = ref(''); const msg = ref(''); const tried = ref(false); const sent = ref(false)
function onSubmit(e){
  tried.value = true
  if (e.target.checkValidity()) { sent.value = true; tried.value = false; email.value=''; msg.value='' }
}
</script>
