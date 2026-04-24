# Progress Tracker

本文件追踪各 Phase 的完成状态。每完成一个 Phase 追加一行并提交。

## Phase 0: 项目初始化
- [x] Task 1: package.json + bunfig.toml
- [x] Task 2: tsconfig.json + 基础目录
- [x] Task 3: Tailwind + vitest 配置
- [x] Task 4: PROGRESS.md + CLAUDE.md + README.md
- [x] Task 4.5: 从 developers 搬运基线主题（样式/布局/基础组件）

## Phase 1: 数据层
- [x] Task 5: SKILL.md 解析器（4 tests）
- [x] Task 6: YAML loader + schema 校验（4 tests）
- [x] Task 7: longbridge CLI wrapper（4 tests）
- [x] Task 8: fetch-data + 缓存兜底（4 tests）
- [x] Task 9: copy-skills（3 tests）
- [x] Task 10: bootstrap-bios 幂等（4 tests）
- [x] Task 11: Buffett YAML 完整版

## Phase 2: Tailwind/主题 样式基线
- [x] Task 12: VitePress config + theme 入口 + locales
- [x] Task 13: 占位首页（让 dev server 能起）

## Phase 3: 列表页
- [x] Task 14: InvestorCard 组件 + 6 测试
- [x] Task 15: InvestorsHomePage（Hero + PlatformStats + 卡片墙）
- [x] Task 16: /investors/ 客户端 301 重定向（三语）
- [x] Task 17: 进度追踪更新

## Phase 4: 详情页组件
- [x] Task 18: InvestorHero（2 tests）
- [x] Task 19: BioSection（1 test）
- [x] Task 20: PhilosophyCards（1 test）
- [x] Task 21: HoldingsTable（2 tests）
- [x] Task 22: NotableHoldings（2 tests）
- [x] Task 23: ChangesPanel（2 tests）
- [x] Task 24: QuotesList（1 test）
- [x] Task 25: MilestonesTimeline（1 test）
- [x] Task 26: DownloadSkillCTA（2 tests）

## Phase 5: 详情页组合
- [x] Task 27: InvestorPage 组合 + VitePress `[slug].paths.ts` 动态路由
- [x] Task 28: 剩余 5 位投资人 YAML（Cathie Wood / Musk / Huang / Altman / Trump）

## Phase 6: i18n 三语完成
- [x] Task 29: 三语 nav config + 三语动态路由落地

## Phase 7: 肖像与打磨
- [x] Task 30: 6 张首字母方块肖像占位图（JPG，待人工替换）

## Phase 8: 构建验证 + CI
- [x] Task 31: 完整构建验证（6 详情页 × 3 语言 + 首页 × 3 语言 + skills + portraits）
- [x] Task 32: GitHub Actions workflow（定时 cron + fetch 兜底 + test + build + artifact）

---

## 交付总结

- **43 个单测全部通过**（6 个脚本 + 9 个组件）
- **静态构建产物**：
  - 18 个投资人详情页（`{lang}/investors/{slug}.html`，6 人 × 3 语言）
  - 3 个语言首页（`/`、`/zh-CN/`、`/zh-HK/`）
  - 6 个可下载 `.skill` ZIP（`/skills/`）
  - 6 张肖像图（`/portraits/`）
- **数据管道**：`longbridge investors <CIK>` → `data/holdings/` + `data/changes/`，失败回退到 `.cache/`
- **CI**：每周一定时拉取 + 构建 + artifact 上传；部署目标待确认

### 后续改进（未在本轮 Plan 中）
- Layout.vue 目前简化为 DefaultTheme.Layout wrapper（T12 的 concern），可进一步接入 developers 的 Nav 定制
- ~~SSR 时 `detectLocale()` 在无 `window` 下退回 en~~ **已修**：新增 `useI18nSync` composable（照搬 developers），用 VitePress `useData().lang` 同步 vue-i18n locale，三语 SSR 产物文案正确切换
- PlatformStats 的 hover 卡片内容仍是 developers 原有 SDK/markets 文本，语义与投资人站不完全匹配，可替换
- UnoCSS 未接线（若未来要启用 `inspira/` 或 `Skill.vue` 完整功能可加）
- 非 13F 投资人的 `cik` 留空；若 Cathie Wood 的 ARK 能查到 CIK，可切回 `holdings_source: "13f"` 以拿到真实 13F 数据
- 部署 target 选定后再解注释 `.github/workflows/build-and-deploy.yml` 中的 deploy job
