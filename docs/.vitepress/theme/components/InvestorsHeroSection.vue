<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FlickeringGrid from './inspira/FlickeringGrid.vue'
import ColourfulText from './inspira/ColourfulText.vue'
import InteractiveHoverButton from './inspira/InteractiveHoverButton.vue'

const { t } = useI18n()

// Brand color scheme from lbus design tokens
const brandColors = [
  'var(--brand-100)',
  'var(--brand-80)',
  'var(--brand-60)',
  'var(--cyan-100)',
  'var(--cyan-80)',
  'var(--cyan-60)',
]

// Flicker grid: LB logo colors (7-10%) + gray (rest)
const flickerColors = [
  { color: '#a8b8be', weight: 91.5 },
  { color: '#ffe000', weight: 3 },
  { color: '#00dbb6', weight: 3 },
  { color: '#fc5200', weight: 2.5 },
]

// Cycle through investor names instead of product names
const names = ['Buffett', 'Cathie Wood', 'Musk', 'Huang', 'Altman']
const currentName = ref(names[0])
let nameInterval: ReturnType<typeof setInterval> | undefined
let nameIndex = 0

onMounted(() => {
  nameInterval = setInterval(() => {
    nameIndex = (nameIndex + 1) % names.length
    currentName.value = names[nameIndex]
  }, 3000)
})

onUnmounted(() => clearInterval(nameInterval))

// i18n computed
const ctaPrimary = computed(() => t('hero.cta.primary'))
const ctaSecondary = computed(() => t('hero.cta.secondary'))
</script>

<template>
  <section class="hero-section">
    <!-- Tech-style background with flicker grid -->
    <div class="hero-bg-wrapper">
      <div class="hero-bg-gradient" />
      <div class="hero-bg-flicker">
        <ClientOnly>
          <FlickeringGrid
            shape="circle"
            :colors="flickerColors"
            :square-size="5"
            :grid-gap="10"
            :flicker-chance="0.25"
            :max-opacity="0.5" />
        </ClientOnly>
      </div>
      <div class="hero-bg-fade" />
    </div>

    <!-- Content -->
    <div class="hero-content">
      <!-- Title -->
      <h1 class="hero-title">
        {{ $t('hero.title.prefix') }} <span class="hero-title-accent">{{ $t('hero.title.accent') }}</span>
      </h1>

      <!-- Following + dynamic investor name -->
      <div class="hero-powering">
        <span class="hero-powering-label">{{ $t('hero.following') }}</span>
        <ClientOnly>
          <span :key="currentName" class="hero-product-text">
            <ColourfulText
              :text="currentName"
              :duration="0.3"
              :colors="brandColors"
              start-color="var(--vp-c-text-1)" />
          </span>
        </ClientOnly>
      </div>

      <!-- Subtitle -->
      <p class="hero-subtitle">{{ $t('hero.subtitle') }}</p>

      <!-- CTA Buttons -->
      <div class="hero-cta">
        <a href="#investors" class="hero-link">
          <InteractiveHoverButton
            :text="ctaPrimary"
            dot-color="var(--brand-10)"
            hover-text-color="var(--brand-100)"
            class="hero-btn-primary" />
        </a>
        <a href="#about" class="hero-link">
          <InteractiveHoverButton
            :text="ctaSecondary"
            dot-color="var(--brand-100)"
            hover-text-color="var(--brand-10)"
            class="hero-btn-secondary" />
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.hero-bg-wrapper {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.hero-bg-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, #00d4a8 10%, transparent) 0%, transparent 70%),
    radial-gradient(ellipse 50% 35% at 15% 100%, color-mix(in srgb, #ffe000 4%, transparent) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 85% 100%, color-mix(in srgb, #00dbb6 6%, transparent) 0%, transparent 60%);
}

:root.dark .hero-bg-gradient {
  background:
    radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, #00dbb6 18%, transparent) 0%, transparent 70%),
    radial-gradient(ellipse 50% 35% at 15% 100%, color-mix(in srgb, #ffe000 6%, transparent) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 85% 100%, color-mix(in srgb, #00d4a8 10%, transparent) 0%, transparent 60%);
}

.hero-bg-flicker {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-bg-fade {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 60% at center, transparent 0%, transparent 40%, var(--vp-c-bg) 90%);
}

.hero-content {
  position: relative;
  z-index: 10;
  max-width: 48rem;
  margin: 0 auto;
  padding: 6rem 1.5rem;
  text-align: center;
  width: 100%;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--vp-c-text-1);
}

@media (min-width: 640px) {
  .hero-title {
    font-size: 3.5rem;
  }
}

@media (min-width: 1024px) {
  .hero-title {
    font-size: 4rem;
  }
}

.hero-title-accent {
  color: var(--vp-c-text-1);
}

.hero-powering {
  margin-top: 1.25rem;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
}

.hero-powering-label {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

@media (min-width: 640px) {
  .hero-powering-label {
    font-size: 1.5rem;
  }
}

.hero-product-text {
  font-size: 1.25rem;
  font-weight: 700;
  display: inline-block;
  min-width: 140px;
  text-align: left;
}

@media (min-width: 640px) {
  .hero-product-text {
    font-size: 1.5rem;
    min-width: 180px;
  }
}

.hero-subtitle {
  margin-top: 1.5rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  font-size: 1.05rem;
  line-height: 1.8;
  color: var(--vp-c-text-2);
  font-weight: 400;
  background: color-mix(in srgb, var(--vp-c-bg) 75%, transparent);
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
}

.hero-cta {
  margin-top: 2rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
}

.hero-link {
  text-decoration: none !important;
}

.hero-btn-primary,
.hero-btn-secondary {
  padding: 0.625rem 2rem;
  font-size: 1rem;
}

.hero-btn-primary {
  border: 1.5px solid var(--brand-100);
  background: var(--brand-100);
  color: var(--brand-10);
}

.hero-btn-secondary {
  background: var(--brand-10);
  border: 1.5px solid var(--brand-100);
  color: var(--brand-100);
}
</style>
