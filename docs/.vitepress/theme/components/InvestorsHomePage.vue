<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InvestorCard from './InvestorCard.vue'
import InvestorCardCompact from './InvestorCardCompact.vue'
import InvestorsHeroSection from './InvestorsHeroSection.vue'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

interface InvestorYaml {
  slug?: string
  display_name: Record<Lang, string>
  tagline: Record<Lang, string>
  role: Record<Lang, string>
  portrait: string
  holdings_source: '13f' | 'curated'
  /** false 表示批量生成、未精选 —— 首页分两段展示：精选大卡 + 批量紧凑卡 */
  featured?: boolean
  /** 仅批量生成的机构有：原始 ranking 顺序 */
  rank?: number
  /** 仅批量生成的机构有：yaml 静态记录的 AUM（fetch 后会用 holdings 实际值兜底） */
  aum_usd?: number
}

interface HoldingsJson {
  total_value_usd?: number
}

const { t, locale } = useI18n()

// @rollup/plugin-yaml already resolves .yaml imports to objects
const yamlMap = import.meta.glob<{ default: InvestorYaml }>(
  '../../../../data/investors/*.yaml',
  { eager: true },
)
const holdingsMap = import.meta.glob<{ default: HoldingsJson }>(
  '../../../../data/holdings/*.json',
  { eager: true },
)

const allInvestors = computed(() => {
  return Object.entries(yamlMap).map(([path, mod]) => {
    const slug = path.split('/').pop()!.replace('.yaml', '')
    const holdingsKey = Object.keys(holdingsMap).find((k) => k.endsWith(`/${slug}.json`))
    const holdings = holdingsKey ? holdingsMap[holdingsKey]?.default : undefined
    return {
      ...mod.default,
      slug,
      total_value_usd: holdings?.total_value_usd ?? 0,
    }
  })
})

// 精选投资人（手工策展的 6 位）—— 顶部大卡 grid
const featured = computed(() =>
  allInvestors.value
    .filter((inv) => inv.featured !== false)
    .sort((a, b) => (b.total_value_usd ?? 0) - (a.total_value_usd ?? 0)),
)

// 批量生成的 13F 机构 —— 下方紧凑卡 grid，按真实 SEC 13F rank 升序（AUM 降序）
const institutions = computed(() =>
  allInvestors.value
    .filter((inv) => inv.featured === false)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
)

const lang = computed<Lang>(() => locale.value as Lang)
</script>

<template>
  <div>
    <InvestorsHeroSection />

    <!-- 精选投资人：6 张大卡 -->
    <section id="investors" class="max-w-6xl mx-auto px-6 pt-16 pb-10">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <InvestorCard
          v-for="inv in featured"
          :key="inv.slug"
          :investor="inv"
          :lang="lang"
        />
      </div>
    </section>

    <!-- 全部 13F 机构：紧凑卡 grid -->
    <section
      v-if="institutions.length > 0"
      id="institutions"
      class="max-w-6xl mx-auto px-6 pb-16"
    >
      <div class="mb-5">
        <h2 class="text-2xl font-bold text-[var(--vp-c-text-1)]">
          {{ t('home.all_institutions') }}
        </h2>
        <p class="mt-1 text-sm text-[var(--vp-c-text-3)]">
          {{ t('home.all_institutions_subtitle') }}
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <InvestorCardCompact
          v-for="inv in institutions"
          :key="inv.slug"
          :investor="inv"
          :lang="lang"
        />
      </div>
    </section>
  </div>
</template>
