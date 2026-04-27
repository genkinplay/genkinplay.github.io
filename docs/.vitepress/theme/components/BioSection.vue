<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type Lang = 'en' | 'zh-CN' | 'zh-HK'

const props = defineProps<{
  bio: Record<Lang, string>
  lang: Lang
  label: string
}>()

const paragraphs = computed(() =>
  props.bio[props.lang].split(/\n\s*\n/).filter(Boolean),
)

const expanded = ref(false)

// 多于一段才提供展开按钮；只有一段时直接全显示
const collapsible = computed(() => paragraphs.value.length > 1)

// 收起时只渲染第一段，其余段落折叠
const visibleParagraphs = computed(() =>
  expanded.value || !collapsible.value ? paragraphs.value : paragraphs.value.slice(0, 1),
)

// 切语言时简介内容会换 → 重置折叠状态
watch(
  () => [props.bio, props.lang],
  () => {
    expanded.value = false
  },
)

const toggleLabel = computed(() => {
  if (props.lang === 'zh-CN') return expanded.value ? '收起' : '展开全文'
  if (props.lang === 'zh-HK') return expanded.value ? '收起' : '展開全文'
  return expanded.value ? 'Show less' : 'Read more'
})
</script>

<template>
  <section class="max-w-7xl mx-auto px-6 py-7">
    <div class="text-xl font-bold text-[var(--vp-c-text-1)] mb-4">{{ label }}</div>
    <div class="space-y-5 text-[var(--vp-c-text-1)] leading-relaxed">
      <p v-for="(p, i) in visibleParagraphs" :key="i">{{ p }}</p>
    </div>

    <div v-if="collapsible" class="mt-3">
      <button
        type="button"
        class="bio-toggle text-sm font-semibold cursor-pointer hover:underline focus-visible:underline focus-visible:outline-none"
        @click="expanded = !expanded"
      >
        {{ toggleLabel }}
        <span aria-hidden="true" class="ml-0.5">{{ expanded ? '↑' : '↓' }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.bio-toggle {
  color: var(--vp-c-brand-1, #00b8b8);
}
</style>
