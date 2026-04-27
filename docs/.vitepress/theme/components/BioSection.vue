<script setup lang="ts">
import { computed } from 'vue'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

const props = defineProps<{
  bio: Record<Lang, string>
  lang: Lang
  label: string
}>()

const paragraphs = computed(() =>
  props.bio[props.lang].split(/\n\s*\n/).filter(Boolean),
)
</script>

<template>
  <section class="max-w-3xl mx-auto px-6 py-12">
    <div class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-4">{{ label }}</div>
    <div class="space-y-5 text-[var(--vp-c-text-1)] leading-relaxed">
      <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
    </div>
  </section>
</template>
