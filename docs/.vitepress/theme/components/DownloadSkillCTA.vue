<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  skillFile: string
  title: string
  description: string
  ctaLabel: string
}>()

const href = computed(() => `/skills/${props.skillFile}`)
</script>

<template>
  <section class="max-w-7xl mx-auto px-6 py-7">
    <div class="rounded-3xl border border-[var(--vp-c-brand-1,#00b8b8)] bg-[var(--vp-c-brand-soft,#e6fffe)] p-8 text-center">
      <h3 class="text-2xl font-bold mb-2">{{ title }}</h3>
      <p class="text-[var(--vp-c-text-2)] max-w-lg mx-auto">{{ description }}</p>
      <a
        :href="href"
        :download="skillFile"
        class="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold bg-[var(--vp-c-brand-1,#00b8b8)] text-white hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
        {{ ctaLabel }}
      </a>
    </div>
  </section>
</template>
