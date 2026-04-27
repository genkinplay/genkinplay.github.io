<script setup lang="ts">
import { computed } from 'vue'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

interface PhilosophyTag {
  icon: string
  title: Record<Lang, string>
  body: Record<Lang, string>
}

const props = defineProps<{
  investor: {
    display_name: Record<Lang, string>
    tagline: Record<Lang, string>
    role: Record<Lang, string>
    portrait: string
    holdings_source: '13f' | 'curated'
    cik: string
    skill_file?: string
    philosophy?: PhilosophyTag[]
  }
  lang: Lang
  period?: string
  aum?: number
  downloadLabel?: string
  downloadHint?: string
}>()

const name    = computed(() => props.investor.display_name[props.lang])
const tagline = computed(() => props.investor.tagline[props.lang])
const role    = computed(() => props.investor.role[props.lang])
const aumB    = computed(() => props.aum ? (props.aum / 1e9).toFixed(2) : null)
const is13f   = computed(() => props.investor.holdings_source === '13f')
const skillHref = computed(() => props.investor.skill_file ? `/skills/${props.investor.skill_file}` : null)
</script>

<template>
  <section class="border-b border-[var(--vp-c-divider)]">
    <div class="max-w-5xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center md:items-start gap-10">
      <img
        :src="investor.portrait"
        :alt="name"
        class="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover shadow-xl shrink-0"
      />
      <div class="flex-1 w-full">
        <div v-if="is13f" class="text-xs font-semibold uppercase tracking-wider text-[var(--vp-c-brand-1,#00b8b8)] mb-2">
          13F Filer
        </div>

        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
          <h1 class="text-4xl md:text-5xl font-bold leading-tight">{{ name }}</h1>

          <a
            v-if="skillHref && downloadLabel"
            :href="skillHref"
            :download="investor.skill_file"
            class="hero-download shrink-0 inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-full font-semibold text-sm text-white bg-[var(--vp-c-brand-1,#00b8b8)] hover:bg-[var(--vp-c-brand-2,#00a3a3)] hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap"
            :title="downloadHint"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {{ downloadLabel }}
          </a>
        </div>

        <p class="text-lg text-[var(--vp-c-text-2)] mt-3">{{ tagline }}</p>
        <p class="text-sm text-[var(--vp-c-text-2)] mt-1">{{ role }}</p>

        <!-- 投资哲学标签：tabindex/focusable 让键盘也能触发 tooltip -->
        <div
          v-if="investor.philosophy?.length"
          class="philosophy-tags mt-4 flex flex-wrap gap-2"
        >
          <span
            v-for="(p, i) in investor.philosophy"
            :key="i"
            tabindex="0"
            class="philosophy-tag relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--vp-c-divider)] bg-[var(--vp-c-bg-soft)] text-[var(--vp-c-text-1)] hover:border-[var(--vp-c-brand-1,#00b8b8)] hover:text-[var(--vp-c-brand-1,#00b8b8)] focus:outline-none focus:ring-2 focus:ring-[var(--vp-c-brand-1,#00b8b8)] cursor-help transition-colors"
          >
            <span aria-hidden="true">{{ p.icon }}</span>
            <span>{{ p.title[lang] }}</span>
            <!-- Tooltip：CSS-only，hover/focus 触发 -->
            <span
              role="tooltip"
              class="philosophy-tooltip pointer-events-none absolute bottom-full left-0 mb-2 w-64 max-w-[80vw] px-3 py-2 rounded-lg text-xs font-normal leading-relaxed text-white bg-[var(--vp-c-text-1)] shadow-lg opacity-0 invisible translate-y-1 transition-all z-20"
            >{{ p.body[lang] }}</span>
          </span>
        </div>

        <div v-if="is13f" class="mt-4 text-sm text-[var(--vp-c-brand-1,#00b8b8)]">
          <span v-if="aumB">${{ aumB }}B</span>
          <span v-if="aumB">&nbsp;·&nbsp;</span>
          <span>CIK {{ investor.cik }}</span>
          <span v-if="period">&nbsp;·&nbsp;as of {{ period }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.philosophy-tag:hover .philosophy-tooltip,
.philosophy-tag:focus .philosophy-tooltip,
.philosophy-tag:focus-within .philosophy-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
</style>
