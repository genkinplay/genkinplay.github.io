<script setup lang="ts">
import { computed } from 'vue'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

const props = defineProps<{
  milestones: { year: number; event: Record<Lang, string> }[]
  lang: Lang
  label: string
}>()

const sorted = computed(() => [...props.milestones].sort((a, b) => a.year - b.year))
</script>

<template>
  <section class="max-w-3xl mx-auto px-6 py-7">
    <div class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-text-2)] mb-4">{{ label }}</div>
    <ol class="relative border-l-2 border-[var(--vp-c-divider)] pl-6 space-y-6">
      <li v-for="m in sorted" :key="m.year" data-milestone class="relative">
        <span class="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-[var(--vp-c-brand-1,#00b8b8)]"></span>
        <div class="font-bold tabular-nums">{{ m.year }}</div>
        <div class="text-[var(--vp-c-text-2)]">{{ m.event[lang] }}</div>
      </li>
    </ol>
  </section>
</template>
