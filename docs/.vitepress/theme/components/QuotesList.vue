<script setup lang="ts">
type Lang = 'en' | 'zh-CN' | 'zh-HK'

defineProps<{
  quotes: { text: Record<Lang, string>; source?: string; year?: number }[]
  lang: Lang
  label: string
}>()
</script>

<template>
  <section class="max-w-7xl mx-auto px-6 py-7">
    <div class="text-xl font-bold text-[var(--vp-c-text-1)] mb-4">{{ label }}</div>
    <div class="space-y-6">
      <blockquote v-for="(q, i) in quotes" :key="i" class="border-l-4 border-[var(--vp-c-brand-1,#00b8b8)] pl-5 italic">
        <p class="text-lg leading-relaxed">"{{ q.text[lang] }}"</p>
        <footer v-if="q.source || q.year" class="text-sm text-[var(--vp-c-text-2)] not-italic mt-2">
          — {{ q.source }}<span v-if="q.year">, {{ q.year }}</span>
        </footer>
      </blockquote>
    </div>
  </section>
</template>
