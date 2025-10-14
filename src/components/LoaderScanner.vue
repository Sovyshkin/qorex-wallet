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
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 25px;
    padding: 20px;
    box-sizing: border-box;
    background: #000000;
}

.video-container {
    position: relative;
    width: 100%;
    max-width: 400px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.loader-video {
    max-width: 100%;
    max-height: 400px;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 20px;
    background: transparent;
    /* Убираем blend mode и фильтры, чтобы видео отображалось как есть */
}

/* Адаптивность для разных экранов */
@media (max-width: 480px) {
    .video-container {
        max-width: 280px;
    }
    
    .wrap-load-scanner {
        gap: 15px;
        padding: 15px;
    }
    
    span {
        font-size: 14px;
        text-align: center;
        line-height: 1.4;
    }
}

@media (min-width: 481px) and (max-width: 768px) {
    .video-container {
        max-width: 320px;
    }
}

@media (min-width: 769px) {
    .video-container {
        max-width: 400px;
    }
}

/* Для очень маленьких экранов */
@media (max-width: 320px) {
    .video-container {
        max-width: 220px;
    }
    
    .wrap-load-scanner {
        gap: 10px;
        padding: 10px;
    }
    
    span {
        font-size: 12px;
    }
}

/* Для больших экранов */
@media (min-width: 1024px) {
    .video-container {
        max-width: 450px;
    }
    
    span {
        font-size: 18px;
    }
}

span {
    color: #fff;
}
</style>

<template>
    <div class="wrap-load-scanner">
      <div class="video-container">
        <video 
          class="loader-video"
          src="../assets/cat-loader.mp4" 
          autoplay 
          loop 
          muted 
          playsinline
          preload="auto"
        ></video>
      </div>
      <span>{{ t('loader_text') }}</span>
    </div>
</template>
<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
