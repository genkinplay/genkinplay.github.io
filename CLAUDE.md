# CLAUDE.md — Longbridge Investors 项目说明

## 项目性质

三语静态站，展示 6 位精选投资名人，每位含：人物介绍 / 持仓（13F 或手工策展） / 季度变化（仅 13F） / 金句 / 里程碑 / 可下载 `.skill` 文件。

## 技术栈

- VitePress 2 + Vue 3 + TypeScript (strict)
- Tailwind v4 + reka-ui + motion-v
- vue-i18n 11（en / zh-CN / zh-HK）
- Bun 运行时 + vitest 测试

## 重要约定

0. **🚨 参照 `../investors_dep/developers` 是硬性要求**：本项目的样式、布局、组件基线 **必须** 从 `../investors_dep/developers/docs/.vitepress/theme/` 搬过来（那是 open.longbridge.com 的官方源码）。自写一套"看起来差不多"的样式 = 白做。详见 plan 顶部的 **"文件级映射"** 表格。凡是写任何 `.vue` / `.css` 前，先去 developers 对应路径看有没有现成的。

1. **Git 政策**：仅 `docs/superpowers/`（spec / plan / brainstorm meta-docs）和 `docs/.vitepress/{cache,dist}/` 忽略；VitePress 源码（`docs/.vitepress/config.mts`、`theme/` 全部组件、`*.md` 内容页等）**入 git** —— CI 必须 checkout 到这些文件才能在 GitHub Actions 上构建。

2. **数据来源**：`longbridge investors <CIK> --format json`（公开 SEC 13F 数据，无需认证）。构建时脚本 `scripts/fetch-data.ts` 调 CLI，失败回退到 `.cache/` 上一次成功快照。

3. **slug 命名**：沿用 `skills/<slug>-skill/` 目录去掉 `-skill` 后缀：`buffett / cathie-wood / jensen-huang / musk / sam-altman / trump`。

4. **路由结构**：
   - `/` = 列表（首页）
   - `/investors/` = 301 到 `/`（保留用户原始需求中的路径）
   - `/investors/{slug}/` = 详情
   - `/zh-CN/...`、`/zh-HK/...` = 中文镜像

5. **测试要求**：脚本层（`scripts/`）与组件纯逻辑强制 TDD，覆盖率 ≥ 80%。页面组合、视觉打磨可依靠人工浏览器验证。

## 常用命令

```bash
bun run dev            # 本地开发
bun run fetch:data     # 拉 13F 数据
bun run bootstrap:bios # 从 SKILL.md 初稿化 YAML
bun run build          # 完整构建（自动先跑 fetch:data + copy:skills）
bun run test           # 单测
bun run typecheck      # 类型检查
```
