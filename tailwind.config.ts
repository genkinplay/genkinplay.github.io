import type { Config } from 'tailwindcss'

/**
 * Tailwind v4 配置。
 *
 * developers 仓库（open.longbridge.com 源码）采用 Tailwind v4 CSS-first 配置风格：
 * 所有 design token 通过 `@theme inline { ... }` 在
 * `docs/.vitepress/theme/style/tailwind.css` 中声明，不在此文件重复定义。
 *
 * 这里只保留 `content`，用于 JIT 扫描 class；其余 theme 扩展一律交给
 * CSS 里的 `@theme` 与 CSS 变量，与 developers 基线保持完全一致。
 */
export default {
  content: [
    './docs/**/*.{md,vue,ts,js}',
    './docs/.vitepress/theme/**/*.{vue,ts,js}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
