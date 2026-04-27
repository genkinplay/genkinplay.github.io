<script setup lang="ts">
type Lang = 'en' | 'zh-CN' | 'zh-HK'

defineProps<{
  items: { icon: string; title: Record<Lang, string>; body: Record<Lang, string> }[]
  lang: Lang
  label: string
}>()
</script>

<template>
  <section class="max-w-5xl mx-auto px-6 py-12">
    <div class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-6">{{ label }}</div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="(it, i) in items"
        :key="i"
        data-philosophy-item
        class="rounded-2xl border border-[var(--vp-c-divider)] p-5 bg-[var(--vp-c-bg)]"
      >
        <div class="text-3xl mb-3">{{ it.icon }}</div>
        <h3 class="font-bold">{{ it.title[lang] }}</h3>
        <p class="text-sm text-[var(--vp-c-text-2)] mt-2 leading-relaxed">{{ it.body[lang] }}</p>
      </div>
    </div>
  </section>
</template>
