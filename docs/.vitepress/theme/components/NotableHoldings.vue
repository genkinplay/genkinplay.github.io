<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

interface Holding {
  name: string
  kind: string
  note: Record<Lang, string>
  disclosure_url?: string
}

const props = defineProps<{
  holdings: Holding[]
  lang: Lang
  label: string
  disclaimer: string
}>()

// 资产类型 kind 字段三语映射。未命中时 fallback 返回原值，所以 YAML 里
// 出现新的 kind 不会破渲染（直接显示英文原文，提示 catalog 需要补翻译）。
const KIND_MAP: Record<string, Record<Lang, string>> = {
  'Listed equity': {
    en: 'Listed equity',
    'zh-CN': '上市股票',
    'zh-HK': '上市股票',
  },
  'Private equity': {
    en: 'Private equity',
    'zh-CN': '私募股权',
    'zh-HK': '私募股權',
  },
  'Private real estate': {
    en: 'Private real estate',
    'zh-CN': '私有不动产',
    'zh-HK': '私有不動產',
  },
  'Private company': {
    en: 'Private company',
    'zh-CN': '私有公司',
    'zh-HK': '私有公司',
  },
  'Charitable vehicle': {
    en: 'Charitable vehicle',
    'zh-CN': '慈善载体',
    'zh-HK': '慈善載體',
  },
  'AI lab (capped-profit)': {
    en: 'AI lab (capped-profit)',
    'zh-CN': 'AI 实验室（限制利润）',
    'zh-HK': 'AI 實驗室（限制利潤）',
  },
}

function localizedKind(kind: string): string {
  return KIND_MAP[kind]?.[props.lang] ?? kind
}

// 从 "NVIDIA (NVDA)" / "Tesla (TSLA)" 这种格式里抽 ticker —— 末尾括号
// 内是 2-5 个大写字母才认。"X Corp (formerly Twitter)" 这种括号里是说明
// 不会被误识别。
function parseName(name: string): { displayName: string; ticker: string | null } {
  const m = /^(.+?)\s*\(([A-Z]{2,5})\)\s*$/.exec(name)
  if (m) return { displayName: m[1]!.trim(), ticker: m[2]! }
  return { displayName: name, ticker: null }
}

// 跟 HoldingsTable / ChangesPanel 一致：lbkrs CDN，无 ticker 时用 name
// 首字母重复 5 次拼 URL（"AAAAA.png"），CDN 会返回首字母占位图。
function tickerIconUrl(ticker: string | null, name?: string): string {
  if (ticker) return `https://assets.lbkrs.com/ticker/ST/US/${ticker}.png`
  const initial =
    (name ?? '').replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || 'X'
  return `https://assets.lbkrs.com/ticker/ST/US/${initial.repeat(5)}.png`
}

const { lang: vpLang } = useData()
const longbridgeLang = computed(() => {
  if (vpLang.value === 'zh-CN') return 'zh-CN'
  if (vpLang.value === 'zh-HK') return 'zh-HK'
  return 'en'
})
const quoteUrl = (ticker: string): string =>
  `https://longbridge.com/${longbridgeLang.value}/quote/${ticker}.US/topics`
</script>

<template>
  <section class="max-w-7xl mx-auto px-6 py-5">
    <div class="flex items-baseline justify-between mb-3">
      <div class="text-xl font-bold text-[var(--vp-c-text-1)]">{{ label }}</div>
      <div class="text-sm text-[var(--vp-c-text-2)]">{{ disclaimer }}</div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <component
        v-for="h in holdings"
        :key="h.name"
        :is="parseName(h.name).ticker ? 'a' : 'div'"
        :href="parseName(h.name).ticker ? quoteUrl(parseName(h.name).ticker!) : undefined"
        :target="parseName(h.name).ticker ? '_blank' : undefined"
        :rel="parseName(h.name).ticker ? 'noopener' : undefined"
        data-holding-card
        class="notable-card no-underline block rounded-2xl border border-[var(--vp-c-divider)] p-4 hover:bg-[var(--vp-c-bg-soft)] hover:shadow-md hover:-translate-y-0.5 transition-all text-[var(--vp-c-text-1)]"
      >
        <!-- 顶部：logo + 名称 + ticker 一组；右上角 kind pill -->
        <div class="flex items-start justify-between gap-2.5 mb-2">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              :src="tickerIconUrl(parseName(h.name).ticker, h.name)"
              :alt="h.name"
              class="w-9 h-9 rounded-full object-cover bg-[var(--vp-c-bg-soft)] shrink-0"
              loading="lazy"
            />
            <div class="min-w-0 flex-1 leading-tight">
              <div class="font-bold text-sm truncate">
                {{ parseName(h.name).displayName }}
              </div>
              <div v-if="parseName(h.name).ticker" class="text-xs font-medium mt-0.5">
                <span class="text-[#4781ff] mr-1">US</span>
                <span class="tabular-nums text-[var(--vp-c-text-2)]">{{ parseName(h.name).ticker }}</span>
              </div>
            </div>
          </div>
          <span class="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium text-[var(--vp-c-text-2)] bg-[var(--vp-c-bg-soft)] border border-[var(--vp-c-divider)] whitespace-nowrap">
            {{ localizedKind(h.kind) }}
          </span>
        </div>

        <!-- note 描述 -->
        <p class="text-sm text-[var(--vp-c-text-2)] leading-snug">{{ h.note[lang] }}</p>
      </component>
    </div>
  </section>
</template>
