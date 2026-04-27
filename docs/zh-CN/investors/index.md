---
title: 正在跳转…
head:
  - - meta
    - http-equiv: refresh
      content: "0; url=/zh-CN/"
---

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const prefix = location.pathname.match(/^\/(zh-CN|zh-HK)\//)
  const target = prefix ? `/${prefix[1]}/` : '/'
  window.location.replace(target)
})
</script>

<div class="max-w-xl mx-auto p-8 text-center text-[var(--vp-c-text-2)]">
  正在跳转到首页…
</div>
