<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InvestorCard from './InvestorCard.vue'
import InvestorsHeroSection from './InvestorsHeroSection.vue'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

interface InvestorYaml {
  slug?: string
  display_name: Record<Lang, string>
  tagline: Record<Lang, string>
  role: Record<Lang, string>
  portrait: string
  holdings_source: '13f' | 'curated'
}

interface HoldingsJson {
  total_value_usd?: number
}

const { locale } = useI18n()

// @rollup/plugin-yaml already resolves .yaml imports to objects
const yamlMap = import.meta.glob<{ default: InvestorYaml }>(
  '../../../../data/investors/*.yaml',
  { eager: true },
)
const holdingsMap = import.meta.glob<{ default: HoldingsJson }>(
  '../../../../data/holdings/*.json',
  { eager: true },
)

const investors = computed(() => {
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

const lang = computed<Lang>(() => locale.value as Lang)
</script>

<template>
  <div>
    <InvestorsHeroSection />

    <section id="investors" class="max-w-6xl mx-auto px-6 py-16">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <InvestorCard
          v-for="inv in investors"
          :key="inv.slug"
          :investor="inv"
          :lang="lang"
        />
      </div>
    </section>
  </div>
</template>
