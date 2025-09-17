<style scoped>
svg {
  width: 3.25em;
  transform-origin: center;
  animation: rotate4 2s linear infinite;
}

circle {
  fill: none;
  stroke: #fff;
  stroke-width: 2;
  stroke-dasharray: 1, 200;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  animation: dash4 1.5s ease-in-out infinite;
}

@keyframes rotate4 {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash4 {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }

  50% {
    stroke-dasharray: 90, 200;
    stroke-dashoffset: -35px;
  }

  100% {
    stroke-dashoffset: -125px;
  }
}

.wrap-load-scanner {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 25px;
}

span {
    color: #fff;
}
</style>

<template>
    <div class="wrap-load-scanner">
  <svg viewBox="25 25 50 50">
    <circle r="20" cy="50" cx="50"></circle>
  </svg>
  <span>{{ t('loader_text') }}</span>
  </div>
</template>
<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
