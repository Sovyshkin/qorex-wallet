<template>
  <div class="app-scanner-container">
    <div class="wrap-load" v-if="walletStore.loaderScan">
      <LoaderScanner/>
    </div>
    <div class="qr-scanner-fullscreen">
      <!-- Кнопка закрытия -->
      <button class="close-btn" @click="goBack">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18 6L6 18M6 6L18 18"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- Видео сканера -->
      <video ref="videoElement" class="scanner-video" playsinline></video>

      <!-- Оверлей с рамкой -->
      <div class="scanner-overlay" v-if="!selectedImage">
        <div class="scan-frame">
          <span></span>
        </div>
        <div class="hint">{{ t('scanner_text') }}</div>
      </div>

      <!-- Контролы -->
      <div class="controls" v-if="!selectedImage">
        <!-- Кнопка выбора файла -->
        <label class="control-btn file-btn">
          <input type="file" accept="image/*" @change="handleFileUpload" hidden />
          <img src="../assets/picture.png" alt="">
        </label>

        <!-- Основная кнопка сканирования -->
        <button class="scan-button" @click="manualScan">
          <div class="scan-button-circle"></div>
        </button>

        <!-- Кнопка фонарика -->
        <button class="control-btn torch-btn" @click="toggleTorch">
          <img src="../assets/lamp.png" alt="">
        </button>
      </div>

      <!-- Превью выбранного изображения -->
      <div v-if="selectedImage" class="image-preview">
        <img :src="selectedImage" alt="selected image" />
        <button class="close-preview" @click="clearImage">×</button>
        <button class="scan-from-preview" @click="scanFromImage">
          {{ t('scanner_text2') }}
        </button>
      </div>

      <!-- Красивое сообщение для пользователя -->
      <div v-if="showMessage" class="message-overlay" @click="hideMessage">
        <div class="message-container" :class="messageType" @click.stop>
          <div class="message-icon">
            <svg v-if="messageType === 'error'" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="messageType === 'success'" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" class="scan-icon">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M10 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="message-text">{{ messageText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import jsQR from "jsqr";
import { BrowserMultiFormatReader } from "@zxing/browser";
import LoaderScanner from "./LoaderScanner.vue";
import { useI18n } from 'vue-i18n';
import { useWalletStore } from "@/stores/walletStore";

const walletStore = useWalletStore()
const { t } = useI18n();
const router = useRouter();
const videoElement = ref(null);
const selectedImage = ref(null);
const isTorchOn = ref(false);
const scanResult = ref(null);
const showMessage = ref(false);
const messageText = ref('');
const messageType = ref('info');
let stream = null;
let scanningInterval = null;
let zxingReader = null;
let isScanning = false;

// Автоматический запуск камеры при монтировании
onMounted(async () => {
  try {
    walletStore.loaderScan = false;
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        goBack();
      }
    };
    document.addEventListener('keydown', handleEscape);
    window.escapeHandler = handleEscape;
    
    // Инициализируем ZXing reader с оптимизацией для QR-кодов
    try {
      zxingReader = new BrowserMultiFormatReader();
      // Оптимизация для QR-кодов
      zxingReader.hints.set(2, 3); // TRY_HARDER
      zxingReader.hints.set(3, true); // PURE_BARCODE
      zxingReader.hints.set(5, 5); // MAX_ITERATIONS
    } catch (error) {
      console.warn('ZXing initialization failed:', error);
      zxingReader = null;
    }
    
    // Оптимальные настройки камеры для QR-кодов терминалов
    const constraints = {
      video: {
        facingMode: "environment",
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, min: 15 },
        focusMode: "continuous"
      },
    };
    
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.value.srcObject = stream;
    
    videoElement.value.addEventListener('loadedmetadata', () => {
      videoElement.value.play().then(() => {
        console.log('Video started, resolution:', videoElement.value.videoWidth, 'x', videoElement.value.videoHeight);
        setTimeout(() => {
          startAutoScanning();
        }, 500);
      });
    });
    
  } catch (error) {
    console.error('Camera error:', error);
    showMessageToUser(t('camera_error'), 'error', 4000);
  }
});

onBeforeUnmount(() => {
  try {
    if (window.escapeHandler) {
      document.removeEventListener('keydown', window.escapeHandler);
      delete window.escapeHandler;
    }
    stopScanner();
  } catch (error) {
    console.error('Error during unmount:', error);
  }
});

const startAutoScanning = () => {
  stopAutoScanning();
  // Более медленный интервал для лучшего качества сканирования
  scanningInterval = setInterval(() => {
    if (!isScanning) {
      performQRScan();
    }
  }, 500);
};

const stopAutoScanning = () => {
  try {
    if (scanningInterval) {
      clearInterval(scanningInterval);
      scanningInterval = null;
    }
    isScanning = false;
  } catch (error) {
    console.error('Error stopping auto scan:', error);
  }
};

// Оптимизированная функция для сканирования QR-кодов терминалов
const performQRScan = async () => {
  if (!videoElement.value || videoElement.value.readyState !== 4 || isScanning) {
    return;
  }

  isScanning = true;

  try {
    const video = videoElement.value;
    
    // Создаем canvas с оптимальным размером для QR-кодов
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { 
      willReadFrequently: true,
      alpha: false 
    });
    
    // Используем среднее разрешение для баланса скорости/качества
    const scale = Math.min(1.0, 800 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    let result = null;
    
    // Сначала пробуем ZXing - лучше всего для терминальных QR-кодов
    if (zxingReader) {
      try {
        const zxingResult = await zxingReader.decodeFromCanvas(canvas);
        if (zxingResult && isValidTerminalQR(zxingResult.getText())) {
          result = zxingResult.getText();
        }
      } catch (error) {
        // ZXing throws error when no QR found, which is normal
      }
    }
    
    // Если ZXing не нашел, пробуем jsQR с обработкой изображения
    if (!result) {
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Применяем легкое улучшение контраста для терминальных QR
        const enhancedData = enhanceForTerminalQR(imageData);
        const jsQRResult = jsQR(enhancedData.data, canvas.width, canvas.height, {
          inversionAttempts: "dontInvert",
          locateRegions: false, // Ускоряет сканирование
          tryHarder: false      // Для скорости
        });
        
        if (jsQRResult && isValidTerminalQR(jsQRResult.data)) {
          result = jsQRResult.data;
        }
      } catch (error) {
        console.log('jsQR scan error:', error);
      }
    }
    
    if (result) {
      handleQRResult(result);
    }
    
  } catch (error) {
    console.log('Scan error:', error);
  } finally {
    isScanning = false;
  }
};

// Функция для улучшения изображения под терминальные QR-коды
const enhanceForTerminalQR = (imageData) => {
  const data = imageData.data;
  const length = data.length;
  
  // Легкое повышение контраста для черно-белых терминальных QR
  for (let i = 0; i < length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Преобразование в grayscale с оптимальными коэффициентами
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Легкое повышение контраста
    const contrast = 1.3;
    const adjusted = ((gray - 128) * contrast) + 128;
    
    const final = Math.max(0, Math.min(255, adjusted));
    data[i] = data[i + 1] = data[i + 2] = final;
  }
  
  return imageData;
};

// Валидация QR-кодов от терминалов
const isValidTerminalQR = (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return false;
  }
  
  const trimmedText = text.trim();
  
  // Паттерны для терминальных QR-кодов
  const terminalPatterns = [
    /^[A-Za-z0-9+/=]{20,500}$/, // Base64-like структура
    /^[A-Za-z0-9\-_]{20,500}$/, // URL-safe base64
    /^(https?|tcp):\/\//,       // URL-ы
    /^[0-9]{10,20}$/,           // Числовые коды
    /^[A-Za-z0-9]{15,50}$/,     // Алфавитно-цифровые коды
    /^[A-Z]{2}[0-9]+/,          // Коды начинающиеся с 2 букв и цифр
  ];
  
  // Проверяем минимальную/максимальную длину для терминальных QR
  if (trimmedText.length < 10 || trimmedText.length > 500) {
    return false;
  }
  
  // Проверяем по паттернам
  return terminalPatterns.some(pattern => pattern.test(trimmedText));
};

const manualScan = async () => {
  showMessageToUser(t('scanning'), 'info', 3000);
  
  // Останавливаем автосканирование на время ручного сканирования
  stopAutoScanning();
  
  try {
    if (!videoElement.value || videoElement.value.readyState !== 4) {
      showMessageToUser(t('camera_not_ready'), 'error', 4000);
      return;
    }
    
    // Даем камере стабилизироваться
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let foundResult = null;
    
    // Делаем 3 попытки с разными настройками
    for (let attempt = 0; attempt < 3 && !foundResult; attempt++) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { 
        willReadFrequently: true,
        alpha: false 
      });
      
      // Разные масштабы для разных попыток
      const scales = [1.0, 1.2, 0.8];
      const scale = scales[attempt];
      
      canvas.width = Math.floor(videoElement.value.videoWidth * scale);
      canvas.height = Math.floor(videoElement.value.videoHeight * scale);
      
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height);
      
      // Пробуем ZXing
      if (zxingReader && !foundResult) {
        try {
          const result = await zxingReader.decodeFromCanvas(canvas);
          if (result && isValidTerminalQR(result.getText())) {
            foundResult = result.getText();
          }
        } catch (error) {
          // Продолжаем пробовать другие методы
        }
      }
      
      // Пробуем jsQR с улучшением
      if (!foundResult) {
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const enhancedData = enhanceForTerminalQR(imageData);
          const result = jsQR(enhancedData.data, canvas.width, canvas.height, {
            inversionAttempts: attempt === 0 ? "dontInvert" : "attemptBoth",
            locateRegions: attempt < 2,
            tryHarder: attempt > 0
          });
          
          if (result && isValidTerminalQR(result.data)) {
            foundResult = result.data;
          }
        } catch (error) {
          console.log('jsQR manual scan error:', error);
        }
      }
      
      // Пауза между попытками
      if (!foundResult) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (foundResult) {
      handleQRResult(foundResult);
    } else {
      showMessageToUser(t('qr_not_found_manual'), 'error', 4000);
      // Возвращаем автосканирование
      startAutoScanning();
    }
    
  } catch (error) {
    console.error('Manual scan error:', error);
    showMessageToUser(t('scan_error'), 'error', 4000);
    startAutoScanning();
  }
};

const scanFromImage = async () => {
  if (!selectedImage.value) return;

  showMessageToUser(t('scanning'), 'info', 5000);
  
  const img = new Image();
  
  img.onload = async function () {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { 
        willReadFrequently: true,
        alpha: false 
      });
      
      // Используем оригинальный размер
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      let foundResult = null;
      
      // Пробуем ZXing первым
      if (zxingReader) {
        try {
          const result = await zxingReader.decodeFromCanvas(canvas);
          if (result && isValidTerminalQR(result.getText())) {
            foundResult = result.getText();
          }
        } catch (error) {
          // Продолжаем пробовать другие методы
        }
      }
      
      // Пробуем jsQR с улучшением
      if (!foundResult) {
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const enhancedData = enhanceForTerminalQR(imageData);
          const result = jsQR(enhancedData.data, canvas.width, canvas.height, {
            inversionAttempts: "attemptBoth",
            locateRegions: true,
            tryHarder: true
          });
          
          if (result && isValidTerminalQR(result.data)) {
            foundResult = result.data;
          }
        } catch (error) {
          console.log('jsQR image scan error:', error);
        }
      }
      
      if (foundResult) {
        handleImageQRResult(foundResult);
      } else {
        showMessageToUser(t('qr_not_in_image'), 'error', 4000);
      }
      
    } catch (error) {
      console.error('Image scan error:', error);
      showMessageToUser(t('image_process_error'), 'error', 4000);
    }
  };

  img.onerror = function () {
    showMessageToUser(t('image_load_error'), 'error', 4000);
  };

  img.src = selectedImage.value;
};

const handleImageQRResult = (qrData) => {
  scanResult.value = qrData;
  stopAutoScanning();
  showMessageToUser(t('qr_found'), 'success', 2000);
  setTimeout(() => {
    walletStore.qrTake(scanResult.value);
  }, 500);
};

const handleQRResult = (qrData) => {
  if (scanResult.value === qrData) {
    return;
  }
  
  scanResult.value = qrData;
  stopAutoScanning();
  showMessageToUser(t('qr_found'), 'success', 2000);
  setTimeout(() => {
    walletStore.qrTake(scanResult.value);
  }, 500);
};

const showMessageToUser = (text, type = 'info', duration = 5000) => {
  messageText.value = text;
  messageType.value = type;
  showMessage.value = true;
  
  setTimeout(() => {
    showMessage.value = false;
  }, duration);
};

const hideMessage = () => {
  showMessage.value = false;
};

const stopScanner = () => {
  try {
    stopAutoScanning();
    
    if (zxingReader) {
      zxingReader = null;
    }
    
    if (stream) {
      stream.getTracks().forEach((track) => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
      stream = null;
    }
  } catch (error) {
    console.error('Error stopping scanner:', error);
  }
};

const toggleTorch = async () => {
  if (!stream) return;

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack || !("applyConstraints" in videoTrack)) {
    return;
  }

  isTorchOn.value = !isTorchOn.value;
  try {
    await videoTrack.applyConstraints({
      advanced: [{ torch: isTorchOn.value }],
    });
  } catch (error) {
    console.error('Torch not supported:', error);
  }
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  stopAutoScanning();

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage.value = e.target.result;
  };
  reader.readAsDataURL(file);
};

const clearImage = () => {
  selectedImage.value = null;
  startAutoScanning();
};

const goBack = () => {
  try {
    stopScanner();
    scanResult.value = null;
    selectedImage.value = null;
    showMessage.value = false;
    
    setTimeout(() => {
      router.push({ name: 'main' });
    }, 100);
  } catch (error) {
    router.go(-1);
  }
};
</script>

<style scoped>
/* Стили остаются без изменений, так как они уже хорошо работают */
.app-scanner-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.qr-scanner-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: black;
  z-index: 1000;
}

.scanner-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.scan-frame {
  width: 70%;
  max-width: 300px;
  height: 300px;
  position: relative;
}

.scan-frame::before,
.scan-frame::after,
.scan-frame span::before,
.scan-frame span::after {
  content: '';
  position: absolute;
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.8);
}

.scan-frame::before {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
  border-radius: 10px 0 0 0;
}

.scan-frame::after {
  top: 0;
  right: 0;
  border-left: none;
  border-bottom: none;
  border-radius: 0 10px 0 0;
}

.scan-frame span::before {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
  border-radius: 0 0 10px 0;
}

.scan-frame span::after {
  bottom: 0;
  left: 0;
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 10px;
}

.hint {
  width: fit-content;
  margin-top: 20px;
  color: white;
  text-align: center;
  padding: 15px 20px;
  border-radius: 10px;
  border: 1px solid black;
  background: rgba(0, 0, 0, 0.4);
}

.scan-button {
  border: 2px solid #fff;
  border-radius: 100%;
  cursor: pointer;
  padding: 5px;
  background: transparent;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.scan-button-circle {
    border-radius: 100%;
    height: 60px;
    width: 60px;
    background: #fff;
}

.controls {
  position: absolute;
  margin: 0 auto;
  bottom: 30px;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 2150;
}

.control-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.control-btn img {
  height: 24px;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2200;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.6);
}

.close-btn:active {
  transform: scale(0.95);
  background: rgba(0, 0, 0, 0.8);
}

.image-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: black;
  z-index: 1002;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.image-preview img {
  max-width: 90%;
  max-height: 70%;
  margin-bottom: 20px;
}

.close-preview {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.scan-from-preview {
  background: #4caf50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
}

.wrap-load {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000000;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.message-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  background: transparent;
  backdrop-filter: none;
  animation: overlayAppear 0.3s ease-out;
  pointer-events: none;
}

@keyframes overlayAppear {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

.message-container {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 24px;
  padding: 20px 28px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 
    0 32px 64px -12px rgba(0, 0, 0, 0.15),
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.3);
  max-width: 300px;
  margin: 0 20px;
  animation: messageAppear 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
  pointer-events: auto;
}

.message-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}

.message-container.success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(16, 185, 129, 0.95) 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.message-container.error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 127, 0.95) 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.message-container.info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(147, 51, 234, 0.95) 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: messageAppear 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55), pulseScan 1.5s ease-in-out infinite;
}

@keyframes pulseScan {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}

.scan-icon {
  animation: scanRotate 2s linear infinite;
}

@keyframes scanRotate {
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(90deg);
  }
  50% {
    transform: rotate(180deg);
  }
  75% {
    transform: rotate(270deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.message-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.message-text {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

@keyframes messageAppear {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(-30px);
    filter: blur(4px);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0px);
  }
}

@media (max-width: 480px) {
  .message-container {
    padding: 16px 22px;
    max-width: 260px;
    border-radius: 20px;
  }
  
  .message-icon {
    width: 24px;
    height: 24px;
  }
  
  .message-text {
    font-size: 14px;
    font-weight: 600;
  }
}
</style>