import { vi } from 'vitest'
import { ref } from 'vue'

// VitePress 的 useData 依赖于运行时上下文，vitest 里没有。
// 这里给所有用到 vitepress 的组件一个最小可用 stub。
vi.mock('vitepress', () => ({
  useData: () => ({
    lang: ref('en'),
    params: ref({}),
    site: ref({}),
    page: ref({}),
    frontmatter: ref({}),
  }),
}))
