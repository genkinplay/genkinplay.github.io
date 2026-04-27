<script setup lang="ts">
type Lang = 'en' | 'zh-CN' | 'zh-HK'

defineProps<{
  holdings: {
    name: string
    kind: string
    note: Record<Lang, string>
    disclosure_url?: string
  }[]
  lang: Lang
  label: string
  disclaimer: string
}>()
</script>

<template>
  <section class="max-w-5xl mx-auto px-6 py-12">
    <div class="flex items-baseline justify-between mb-4">
      <div class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-text-2)]">{{ label }}</div>
      <div class="text-xs text-[var(--vp-c-text-2)]">{{ disclaimer }}</div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="h in holdings" :key="h.name" data-holding-card class="rounded-2xl border border-[var(--vp-c-divider)] p-5 bg-[var(--vp-c-bg)]">
        <div class="flex items-baseline justify-between">
          <h3 class="font-bold text-lg">{{ h.name }}</h3>
          <span class="text-xs text-[var(--vp-c-text-2)]">{{ h.kind }}</span>
        </div>
        <p class="text-sm text-[var(--vp-c-text-2)] mt-2">{{ h.note[lang] }}</p>
        <a v-if="h.disclosure_url" :href="h.disclosure_url" class="text-xs text-[var(--vp-c-brand-1,#00b8b8)] mt-3 inline-block" target="_blank" rel="noopener">
          Source →
        </a>
      </div>
    </div>
  </section>
</template>
