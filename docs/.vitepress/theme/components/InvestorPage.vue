<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useData } from 'vitepress'
import InvestorHero from './InvestorHero.vue'
import BioSection from './BioSection.vue'
// PhilosophyCards 已移除：投资哲学改为 Hero 顶部的 hover 标签展示
import HoldingsTable from './HoldingsTable.vue'
import NotableHoldings from './NotableHoldings.vue'
import ChangesPanel from './ChangesPanel.vue'
import InsiderTrades from './InsiderTrades.vue'
// QuotesList 已移除（按用户要求详情页不再展示金句）
// MilestonesTimeline 已移除（按用户要求详情页不再展示里程碑）
// DownloadSkillCTA 已并入 Hero 顶部，详情页底部不再重复展示

type Lang = 'en' | 'zh-CN' | 'zh-HK'

const { t, locale } = useI18n()
const { params } = useData()

// 相对路径（别名在 import.meta.glob 里不保证）
const yamlMap = import.meta.glob<{ default: Record<string, unknown> }>(
  '../../../../data/investors/*.yaml',
  { eager: true },
)
const holdingsMap = import.meta.glob<{ default: unknown }>(
  '../../../../data/holdings/*.json',
  { eager: true },
)
const changesMap = import.meta.glob<{ default: unknown }>(
  '../../../../data/changes/*.json',
  { eager: true },
)
const insiderMap = import.meta.glob<{ default: unknown }>(
  '../../../../data/insider-trades/*.json',
  { eager: true },
)

const findBySlug = <T,>(
  map: Record<string, { default: T }>,
  slug: string,
  ext: string,
): T | undefined => {
  const key = Object.keys(map).find((k) => k.endsWith(`/${slug}.${ext}`))
  return key ? map[key]?.default : undefined
}

const slug = computed(() => (params.value?.slug as string) ?? '')
const investor = computed(() => findBySlug(yamlMap, slug.value, 'yaml') as any)
const holdings = computed(() => findBySlug(holdingsMap, slug.value, 'json') as any)
const changes = computed(() => findBySlug(changesMap, slug.value, 'json') as any)
const insider = computed(() => findBySlug(insiderMap, slug.value, 'json') as any)
const lang = computed<Lang>(() => locale.value as Lang)
const is13f = computed(() => investor.value?.holdings_source === '13f')
</script>

<template>
  <div v-if="investor">
    <InvestorHero
      :investor="investor"
      :lang="lang"
      :period="holdings?.period"
      :aum="holdings?.total_value_usd"
      :download-label="t('detail.download_cta')"
      :download-hint="t('detail.download_desc')"
    />

    <BioSection :bio="investor.bio" :lang="lang" :label="t('detail.bio')" />

    <HoldingsTable
      v-if="is13f && holdings?.holdings?.length"
      :holdings="holdings.holdings"
      :top-n="20"
      :label="t('detail.holdings_13f')"
      :period-label="`${t('detail.as_of')} ${holdings.period}`"
    />

    <NotableHoldings
      v-if="!is13f && investor.notable_holdings?.length"
      :holdings="investor.notable_holdings"
      :lang="lang"
      :label="t('detail.holdings_curated')"
      disclaimer="Public disclosure"
    />

    <ChangesPanel
      v-if="is13f && changes"
      :data="changes"
      :label="t('detail.changes')"
    />

    <InsiderTrades
      v-if="insider?.trades?.length"
      :data="insider"
      :label="t('detail.insider_trades')"
      :ticker_label="t('detail.insider_ticker_label')"
    />
  </div>
</template>
