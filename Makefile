# Longbridge Investors — Makefile
# 常用命令入口，封装 bun script + 工具链调用。

# ────────────────── Variables ──────────────────
BUN          := bun
DIST_DIR     := docs/.vitepress/dist
CACHE_DIR    := .cache
PORTRAIT_DIR := public/portraits
SLUGS        := buffett cathie-wood musk jensen-huang sam-altman trump
DICEBEAR_BASE := https://api.dicebear.com/9.x/notionists/svg
DICEBEAR_BG  := backgroundColor=e6fffe,b8f4ec,c7eaff&backgroundType=gradientLinear

# ────────────────── Top-level ──────────────────
.PHONY: help install dev build preview test typecheck \
        fetch bootstrap copy-skills portraits clean ci all

.DEFAULT_GOAL := help

help: ## 显示所有可用命令
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ────────────────── Setup ──────────────────
install: ## 安装依赖（bun install）
	$(BUN) install

# ────────────────── Dev / Build ──────────────────
dev: ## 启动 VitePress dev server
	$(BUN) run dev

build: ## 完整构建（fetch:data + copy:skills + vitepress build）
	$(BUN) run build

preview: ## 预览构建产物
	$(BUN) run preview

# ────────────────── QA ──────────────────
test: ## 跑全部单测
	$(BUN) run test

typecheck: ## 类型检查
	$(BUN) run typecheck

ci: install test typecheck build ## CI 流水线本地复刻（install + test + typecheck + build）

# ────────────────── Data pipeline ──────────────────
fetch: ## 拉取 13F 持仓 + 季度变化 JSON
	$(BUN) run fetch:data

bootstrap: ## 从 SKILL.md 幂等回填 YAML 初稿
	$(BUN) run bootstrap:bios

copy-skills: ## 拷 skills/*.skill 到 public/skills/
	$(BUN) run copy:skills

# ────────────────── Portraits ──────────────────
portraits: ## 重新生成 DiceBear 卡通头像（slug 作 seed）
	@mkdir -p $(PORTRAIT_DIR)
	@for slug in $(SLUGS); do \
		echo "→ $$slug"; \
		curl -sS "$(DICEBEAR_BASE)?seed=$$slug&size=400&$(DICEBEAR_BG)" \
		  -o "$(PORTRAIT_DIR)/$$slug.svg" || exit 1; \
	done
	@echo "✓ 6 张头像已写入 $(PORTRAIT_DIR)/"

# ────────────────── Cleanup ──────────────────
clean: ## 清空构建产物与缓存
	rm -rf $(DIST_DIR) $(CACHE_DIR) data/holdings data/changes public/skills

all: install fetch copy-skills build ## 一键交付（install + fetch + copy + build）
