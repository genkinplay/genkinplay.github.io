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
const skillHref = computed(() => props.investor.skill_file ? `/install/${props.investor.skill_file}` : null)

// 日期本地化：YYYY-MM-DD → en: "Dec 31, 2025" / zh-CN/HK: "2025 年 12 月 31 日"
const periodLabel = computed(() => {
  if (!props.period) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(props.period)
  if (!m) return props.period
  const [, y, mo, d] = m
  if (props.lang === 'zh-CN' || props.lang === 'zh-HK') {
    return `${y} 年 ${parseInt(mo!, 10)} 月 ${parseInt(d!, 10)} 日`
  }
  // en: "Dec 31, 2025"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(mo!, 10) - 1]} ${parseInt(d!, 10)}, ${y}`
})

// "As of" 三语标签（en 句首大写，与 ·分隔的独立短语习惯一致）
const asOfLabel = computed(() => {
  if (props.lang === 'zh-CN') return '截至'
  if (props.lang === 'zh-HK') return '截至'
  return 'As of'
})

// Badge 调色板：按 philosophy 索引轮转上色，每位投资人前 3-5 条哲学
// 拿到不同的视觉色系，避免单调。色值用 hex 直接写以保证 dark/light 都可读
const BADGE_PALETTE: { bg: string; text: string; ring: string }[] = [
  { bg: '#e6fffe', text: '#00746f', ring: '#7dd3cf' }, // teal
  { bg: '#fff1d6', text: '#9a6700', ring: '#f0c876' }, // amber
  { bg: '#ffe8d9', text: '#9c3a0c', ring: '#ffb088' }, // orange
  { bg: '#e8f0ff', text: '#1f4dbb', ring: '#90b3ff' }, // blue
  { bg: '#f3e8ff', text: '#6b21a8', ring: '#c4a4ef' }, // purple
  { bg: '#fce7f3', text: '#9d174d', ring: '#f0a3c8' }, // pink
]

function badgeStyle(index: number) {
  const c = BADGE_PALETTE[index % BADGE_PALETTE.length]!
  return {
    backgroundColor: c.bg,
    color: c.text,
    '--badge-ring': c.ring,
  }
}
</script>

<template>
  <section class="border-b border-[var(--vp-c-divider)]">
    <div class="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center md:items-start gap-10">
      <img
        :src="investor.portrait"
        :alt="name"
        class="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover shadow-xl shrink-0"
      />
      <div class="flex-1 w-full">
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
          <div class="min-w-0">
            <h1 class="text-4xl md:text-5xl font-bold leading-tight">{{ name }}</h1>
            <!-- 中文页面展示英文副名（参照 longbridge 卡片"主标本地化 / 副标国际名"思路）-->
            <div
              v-if="lang !== 'en' && investor.display_name.en && investor.display_name.en !== name"
              class="text-base md:text-lg font-medium text-[#4781ff] mt-1.5"
            >{{ investor.display_name.en }}</div>
          </div>

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

        <!-- 投资哲学 badge：按索引轮换色块；hover/focus 显示完整说明 -->
        <div
          v-if="investor.philosophy?.length"
          class="philosophy-tags mt-4 flex flex-wrap gap-2"
        >
          <span
            v-for="(p, i) in investor.philosophy"
            :key="i"
            tabindex="0"
            :style="badgeStyle(i)"
            class="philosophy-tag relative inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold tracking-tight cursor-help transition-all"
          >
            {{ p.title[lang] }}
            <!-- Hover 卡片：参照 longbridge.com 股票卡片视觉
                 标题 + 英文副标 + 分隔线 + 描述。CSS-only 触发。-->
            <span
              role="tooltip"
              class="philosophy-card pointer-events-none absolute bottom-full left-0 mb-3 w-80 max-w-[90vw] rounded-2xl bg-[var(--vp-c-bg)] border border-[var(--vp-c-divider)] shadow-2xl opacity-0 invisible translate-y-1 transition-all z-20 text-left"
            >
              <div class="px-5 pt-5 pb-4">
                <div class="text-base font-bold text-[var(--vp-c-text-1)] leading-tight">{{ p.title[lang] }}</div>
                <div
                  v-if="lang !== 'en' && p.title.en && p.title.en !== p.title[lang]"
                  class="text-sm font-medium text-[#4781ff] mt-1"
                >{{ p.title.en }}</div>
              </div>
              <div class="border-t border-[var(--vp-c-divider)]"></div>
              <div class="px-5 py-4 text-sm text-[var(--vp-c-text-2)] leading-relaxed font-normal">
                {{ p.body[lang] }}
              </div>
            </span>
          </span>
        </div>

        <div v-if="is13f" class="mt-4 text-sm text-[var(--vp-c-brand-1,#00b8b8)]">
          <span v-if="aumB">${{ aumB }}B</span>
          <span v-if="aumB">&nbsp;·&nbsp;</span>
          <span>CIK {{ investor.cik }}</span>
          <span v-if="periodLabel">&nbsp;·&nbsp;{{ asOfLabel }} {{ periodLabel }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.philosophy-tag:hover,
.philosophy-tag:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--badge-ring, #7dd3cf);
  transform: translateY(-1px);
}

.philosophy-tag:hover .philosophy-card,
.philosophy-tag:focus .philosophy-card,
.philosophy-tag:focus-within .philosophy-card {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
</style>
