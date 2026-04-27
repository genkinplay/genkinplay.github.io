<template>
  <VPLayout />
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useI18nSync } from '../composables/useI18nSync'

// 把 VitePress route lang 同步到 vue-i18n locale，
// 这样切换 /、/zh-CN/、/zh-HK/ 时所有 t('...') 文案实时跟着变。
useI18nSync()

const VPLayout = DefaultTheme.Layout
</script>
