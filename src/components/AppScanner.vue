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
      <div id="qr-reader" ref="qrReader" class="qr-reader-container"></div>

      <!-- Оверлей с рамкой -->
      <div class="scanner-overlay">
        <div class="scan-frame">
          <span></span>
        </div>
        <div class="hint">Наведите камеру на QR-код для оплаты</div>
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
import { Html5QrcodeScanner } from 'html5-qrcode';
import LoaderScanner from "./LoaderScanner.vue";
import { useI18n } from 'vue-i18n';
import { useWalletStore } from "@/stores/walletStore";

const walletStore = useWalletStore()
const { t } = useI18n();
const router = useRouter();
const qrReader = ref(null);
const selectedImage = ref(null);
const isTorchOn = ref(false);
const scanResult = ref(null);
const showMessage = ref(false);
const messageText = ref('');
const messageType = ref('info');

let scanner = null;
let isScanning = false;
let videoObserver = null;
let frameScanner = null;
let videoElement = null;

// Определяем Telegram
const isTelegram = () => {
  return window.Telegram?.WebApp || 
         navigator.userAgent.includes('Telegram') ||
         navigator.userAgent.includes('TelegramBot') ||
         window.TelegramWebviewProxy ||
         window.external?.notify ||
         document.referrer.includes('telegram');
};

const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString();
  const prefix = `[QR_SCANNER_DEBUG ${timestamp}]`;
  
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
};

const errorLog = (message, error = null) => {
  const timestamp = new Date().toISOString();
  const prefix = `[QR_SCANNER_ERROR ${timestamp}]`;
  
  if (error) {
    console.error(prefix, message, error);
  } else {
    console.error(prefix, message);
  }
};

// Инициализация сканера
const initializeScanner = () => {
  debugLog('🎯 Initializing scanner');
  
  if (scanner) {
    try {
      scanner.clear();
    } catch (e) {
      errorLog('Error clearing previous scanner', e);
    }
  }

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    rememberLastUsedCamera: true,
    useBarCodeDetectorIfSupported: false,
    aspectRatio: 1.0,
    showTorchButtonIfSupported: false,
    showZoomSliderIfSupported: false,
    videoConstraints: isTelegram() ? {
      video: true
    } : {
      facingMode: "environment",
      width: { ideal: 1280, min: 640 },
      height: { ideal: 720, min: 480 }
    },
    disableFlip: true,
    verbose: false
  };

  try {
    scanner = new Html5QrcodeScanner("qr-reader", config, false);
    debugLog('✅ Scanner created successfully');
  } catch (error) {
    errorLog('Failed to create scanner', error);
    showMessageToUser('Ошибка инициализации сканера', 'error', 5000);
  }
};

// Запуск сканера
const startScanner = () => {
  debugLog('🚀 Starting scanner');
  
  if (isScanning) {
    debugLog('⚠️ Scanner already running');
    return;
  }

  if (!scanner) {
    errorLog('❌ Scanner not initialized');
    return;
  }

  try {
    scanner.render(
      (decodedText) => {
        debugLog('Built-in scanner detected QR (ignoring):', decodedText);
      },
      (errorMessage) => {
        debugLog('Built-in scanner error:', errorMessage);
      }
    );

    isScanning = true;
    debugLog('✅ Scanner render called');

    // Наблюдатель за видео элементом
    setupVideoObserver();
    
    // Для Telegram добавляем специальную обработку
    if (isTelegram()) {
      setupTelegramHandlers();
    }

    // Скрываем UI элементы
    setTimeout(hideHtml5QrcodeUI, 100);
    setTimeout(hideHtml5QrcodeUI, 500);
    setTimeout(hideHtml5QrcodeUI, 1000);
        
  } catch (error) {
    errorLog('Scanner start failed', error);
    showMessageToUser('Ошибка запуска сканера', 'error', 4000);
    isScanning = false;
  }
};

// Обработчики для Telegram
const setupTelegramHandlers = () => {
  debugLog('📱 Setting up Telegram handlers');
  
  // Обработчик клика для активации видео
  const activateVideo = () => {
    const video = document.querySelector('#qr-reader video');
    if (video && video.paused) {
      debugLog('👆 User interaction detected, activating video');
      
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      
      video.play().then(() => {
        debugLog('✅ Video play successful after user interaction');
        showMessageToUser('Камера активирована', 'success', 2000);
      }).catch(err => {
        errorLog('Video play failed after user interaction', err);
      });
    }
  };

  // Добавляем обработчики для активации видео
  document.addEventListener('click', activateVideo);
  document.addEventListener('touchstart', activateVideo);
  
  // Сохраняем для очистки
  window.telegramVideoActivator = activateVideo;
};

// Наблюдатель за видео
const setupVideoObserver = () => {
  if (videoObserver) {
    videoObserver.disconnect();
  }

  videoObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const video = document.querySelector('#qr-reader video');
        if (video && !video.dataset.configured) {
          debugLog('✅ New video element found and configuring');
          video.dataset.configured = 'true';
          videoElement = video;
          
          // Применяем стили
          applyVideoStyles(video);
          
          // Запускаем сканирование кадров
          video.addEventListener('loadeddata', () => {
            debugLog('📹 Video data loaded, starting frame scanning');
            setTimeout(() => {
              startFrameScanning();
              showMessageToUser('Сканирование активно', 'info', 2000);
            }, 1000);
          });
        }
        
        // Скрываем UI элементы
        hideHtml5QrcodeUI();
      }
    });
  });

  const qrReaderElement = document.getElementById('qr-reader');
  if (qrReaderElement) {
    videoObserver.observe(qrReaderElement, {
      childList: true,
      subtree: true
    });
  }
};

// Применение стилей к видео
const applyVideoStyles = (video) => {
  video.style.cssText = `
    display: block !important;
    width: 100vw !important;
    height: 100vh !important;
    object-fit: cover !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    z-index: 1 !important;
    visibility: visible !important;
    opacity: 1 !important;
    background: black !important;
  `;
};

// Скрытие UI элементов сканера
const hideHtml5QrcodeUI = () => {
  try {
    const elementsToHide = [
      '#qr-reader__dashboard_section',
      '#qr-reader__camera_selection', 
      '#qr-reader__filescan_input',
      '#html5-qrcode-button-camera-permission',
      '#html5-qrcode-anchor-scan-type-change',
      '#qr-reader__dashboard',
      '#qr-reader__header_message',
      '#qr-shaded-region',
      '.html5-qrcode-element',
      '[id*="html5-qrcode-help"]',
      '[id*="qr-reader-help"]',
      '[class*="help"]',
      '[class*="info-button"]',
      '.qr-code-help',
      '.html5-qrcode-info'
    ];
    
    elementsToHide.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
      }
    });
  } catch (error) {
    // Игнорируем ошибки
  }
};

// Сканирование кадров
const startFrameScanning = () => {
  if (frameScanner) {
    clearInterval(frameScanner);
  }
  
  frameScanner = setInterval(() => {
    if (isScanning && videoElement && videoElement.readyState === 4) {
      captureAndScanFrame();
    }
  }, 300);
};

const captureAndScanFrame = async () => {
  if (!videoElement || videoElement.readyState !== 4) return;
  
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      try {
        const tempDiv = document.createElement('div');
        tempDiv.id = 'temp-frame-scan-region';
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        const { Html5Qrcode } = await import('html5-qrcode');
        const html5QrCode = new Html5Qrcode('temp-frame-scan-region');
        const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
        
        const result = await html5QrCode.scanFile(file, true);
        if (result) {
          onScanSuccess(result);
        }
        
        await html5QrCode.clear();
        if (document.getElementById('temp-frame-scan-region')) {
          document.body.removeChild(tempDiv);
        }
      } catch (scanError) {
        // QR-код не найден - это нормально
        const tempDiv = document.getElementById('temp-frame-scan-region');
        if (tempDiv) {
          document.body.removeChild(tempDiv);
        }
      }
    }, 'image/jpeg', 0.8);
  } catch (error) {
    // Игнорируем ошибки
  }
};

// Обработка успешного сканирования
const onScanSuccess = (decodedText) => {
  const isPaymentQR = decodedText && (
    decodedText.toLowerCase().includes('bitcoin:') ||
    decodedText.toLowerCase().includes('ethereum:') ||
    decodedText.toLowerCase().includes('ton:') ||
    decodedText.startsWith('0x') ||
    decodedText.match(/^[13][a-km-z1-9]{25,34}$/i) ||
    decodedText.match(/^[A-Za-z0-9]{48}$/) ||
    decodedText.includes('amount=') ||
    decodedText.includes('value=') ||
    decodedText.length > 20
  );
  
  scanResult.value = decodedText;
  
  if (isPaymentQR) {
    showMessageToUser('Платежный QR-код распознан!', 'success', 1500);
  } else {
    showMessageToUser('QR-код найден!', 'success', 1500);
  }
  
  walletStore.qrTake(decodedText);
};

// Ручное сканирование
const manualScan = async () => {
  if (!isScanning) {
    showMessageToUser('Запуск сканера...', 'info', 2000);
    
    if (!scanner) {
      initializeScanner();
    }
    
    startScanner();
  } else {
    showMessageToUser('Сканирование активно', 'info', 2000);
  }
};

// Фонарик
const toggleTorch = async () => {
  const video = document.querySelector('#qr-reader video');
  if (!video || !video.srcObject) {
    showMessageToUser('Фонарик недоступен', 'error', 2000);
    return;
  }

  const stream = video.srcObject;
  const videoTrack = stream.getVideoTracks()[0];
  
  if (!videoTrack || !("applyConstraints" in videoTrack)) {
    showMessageToUser('Фонарик не поддерживается', 'error', 2000);
    return;
  }

  isTorchOn.value = !isTorchOn.value;
  try {
    await videoTrack.applyConstraints({
      advanced: [{ torch: isTorchOn.value }],
    });
    showMessageToUser(isTorchOn.value ? 'Фонарик включен' : 'Фонарик выключен', 'info', 1000);
  } catch (error) {
    showMessageToUser('Фонарик не поддерживается на этом устройстве', 'error', 3000);
    isTorchOn.value = false;
  }
};

// Загрузка файла
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showMessageToUser('Пожалуйста, выберите изображение', 'error', 3000);
    return;
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showMessageToUser('Файл слишком большой. Максимальный размер: 10MB', 'error', 3000);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage.value = e.target.result;
  };
  reader.readAsDataURL(file);
  
  event.target.value = '';
};

// Сканирование из изображения
const scanFromImage = async () => {
  if (!selectedImage.value) return;

  showMessageToUser('Сканирование изображения...', 'info', 5000);
  
  try {
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-scan-region';
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);
    
    const { Html5Qrcode } = await import('html5-qrcode');
    const html5QrCode = new Html5Qrcode('temp-scan-region');
    
    try {
      const response = await fetch(selectedImage.value);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });
      
      const result = await html5QrCode.scanFile(file, true);
      handleImageQRResult(result);
      
    } catch (scanError) {
      showMessageToUser('QR-код не найден в изображении', 'error', 4000);
    } finally {
      try {
        await html5QrCode.clear();
      } catch (e) {
        // Игнорируем ошибки
      }
      if (document.getElementById('temp-scan-region')) {
        document.body.removeChild(tempDiv);
      }
    }
    
  } catch (error) {
    showMessageToUser('Ошибка сканирования изображения', 'error', 4000);
  }
};

const handleImageQRResult = (qrData) => {
  scanResult.value = qrData;
  showMessageToUser('QR-код найден!', 'success', 2000);
  setTimeout(() => {
    walletStore.qrTake(scanResult.value);
    goBack();
  }, 500);
};

// Очистка изображения
const clearImage = () => {
  selectedImage.value = null;
};

// Остановка сканера
const stopScanner = () => {
  debugLog('🛑 Stopping scanner');
  
  try {
    stopFrameScanning();
    
    if (videoObserver) {
      videoObserver.disconnect();
      videoObserver = null;
    }
    
    if (scanner && isScanning) {
      scanner.clear().catch((error) => {
        errorLog('Error clearing scanner', error);
      });
      isScanning = false;
    }
    
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject;
      stream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
      videoElement.srcObject = null;
    }
    
    videoElement = null;
    
    // Очищаем обработчики Telegram
    if (window.telegramVideoActivator) {
      document.removeEventListener('click', window.telegramVideoActivator);
      document.removeEventListener('touchstart', window.telegramVideoActivator);
      delete window.telegramVideoActivator;
    }
    
  } catch (error) {
    errorLog('Error during scanner stop', error);
  }
};

const stopFrameScanning = () => {
  if (frameScanner) {
    clearInterval(frameScanner);
    frameScanner = null;
  }
};

// Сообщения пользователю
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

// Навигация
const goBack = () => {
  try {
    // Восстанавливаем стили
    if (window.originalBodyStyle !== undefined) {
      document.body.style.cssText = window.originalBodyStyle;
      delete window.originalBodyStyle;
    }
    
    if (window.originalHtmlStyle !== undefined) {
      document.documentElement.style.cssText = window.originalHtmlStyle;
      delete window.originalHtmlStyle;
    }
    
    stopScanner();
    
    setTimeout(() => {
      router.push({ name: 'main' }).catch(() => {
        router.push('/').catch(() => {
          window.location.href = '/';
        });
      });
    }, 100);
    
  } catch (error) {
    try {
      router.push('/');
    } catch {
      window.location.href = '/';
    }
  }
};

// Инициализация
onMounted(async () => {
  debugLog('🚀 Component mounted');
  
  walletStore.loaderScan = false;
  
  // Сохраняем оригинальные стили
  const originalBodyStyle = document.body.style.cssText;
  const originalHtmlStyle = document.documentElement.style.cssText;
  
  document.body.style.cssText = `
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    width: 100vw !important;
    height: 100vh !important;
  `;
  
  document.documentElement.style.cssText = `
    margin: 0 !important;
    padding: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
  `;
  
  window.originalBodyStyle = originalBodyStyle;
  window.originalHtmlStyle = originalHtmlStyle;
  
  // Обработчик Escape
  const handleEscape = (event) => {
    if (event.key === 'Escape') {
      goBack();
    }
  };
  document.addEventListener('keydown', handleEscape);
  window.escapeHandler = handleEscape;
  
  try {
    // Проверяем доступ к камере
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true 
    });
    
    // Останавливаем тестовый поток
    stream.getTracks().forEach(track => track.stop());
    
    // Инициализируем и запускаем сканер
    initializeScanner();
    
    if (isTelegram()) {
      showMessageToUser('Нажмите на экран для активации камеры', 'info', 5000);
      setTimeout(() => startScanner(), 1000);
    } else {
      setTimeout(() => startScanner(), 100);
    }
    
  } catch (cameraError) {
    errorLog('Camera initialization failed', cameraError);
    
    if (cameraError.name === 'NotAllowedError') {
      showMessageToUser('Доступ к камере запрещен. Разрешите доступ в настройках браузера.', 'error', 6000);
    } else if (cameraError.name === 'NotFoundError') {
      showMessageToUser('Камера не найдена', 'error', 6000);
    } else {
      showMessageToUser('Ошибка доступа к камере', 'error', 6000);
    }
  }
});

onBeforeUnmount(() => {
  try {
    // Очищаем обработчики
    if (window.telegramVideoActivator) {
      document.removeEventListener('click', window.telegramVideoActivator);
      document.removeEventListener('touchstart', window.telegramVideoActivator);
      delete window.telegramVideoActivator;
    }
    
    if (window.escapeHandler) {
      document.removeEventListener('keydown', window.escapeHandler);
      delete window.escapeHandler;
    }
    
    // Восстанавливаем стили
    if (window.originalBodyStyle !== undefined) {
      document.body.style.cssText = window.originalBodyStyle;
      delete window.originalBodyStyle;
    }
    
    if (window.originalHtmlStyle !== undefined) {
      document.documentElement.style.cssText = window.originalHtmlStyle;
      delete window.originalHtmlStyle;
    }
    
    stopScanner();
  } catch (error) {
    // Игнорируем ошибки
  }
});
</script>

<style scoped>
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

.qr-reader-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

#qr-reader {
  width: 100% !important;
  height: 100% !important;
  position: relative !important;
}

/* Скрываем UI элементы сканера */
#qr-reader__dashboard_section,
#qr-reader__camera_selection,
#qr-reader__filescan_input,
#qr-reader__header_message,
#qr-shaded-region,
.html5-qrcode-element,
[id*="html5-qrcode-help"],
[id*="qr-reader-help"],
[class*="help"],
[class*="info-button"],
.qr-code-help,
.html5-qrcode-info,
#qr-reader > div > div:last-child,
#qr-reader [style*="position: absolute"][style*="top"][style*="right"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

#qr-reader__scan_region {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

/* Оверлей с рамкой сканирования */
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
  z-index: 100;
  pointer-events: none;
}

.scan-frame {
  width: 70%;
  max-width: 300px;
  height: 300px;
  position: relative;
  pointer-events: none;
}

.scan-frame::before,
.scan-frame::after,
.scan-frame span::before,
.scan-frame span::after {
  content: '';
  position: absolute;
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.9);
  z-index: 101;
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
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.6);
  z-index: 101;
  backdrop-filter: blur(10px);
  font-weight: 500;
  font-size: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Контролы */
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
  z-index: 200;
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

/* Кнопка закрытия */
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
  z-index: 200;
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

/* Превью изображения */
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

/* Лоадер */
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

/* Сообщения */
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

<!-- Глобальные стили для видео -->
<style>
#qr-reader video {
  display: block !important;
  width: 100vw !important;
  height: 100vh !important;
  object-fit: cover !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  z-index: 1 !important;
  visibility: visible !important;
  opacity: 1 !important;
  background: black !important;
}

#qr-reader,
#qr-reader > div,
#qr-reader__scan_region {
  display: block !important;
  width: 100vw !important;
  height: 100vh !important;
  position: relative !important;
  background: black !important;
}

#qr-reader__dashboard_section,
#qr-reader__camera_selection,
#qr-reader__filescan_input,
#qr-reader__header_message,
#qr-shaded-region,
.html5-qrcode-element,
[id*="html5-qrcode-help"],
[id*="qr-reader-help"],
[class*="help"],
[class*="info-button"],
.qr-code-help,
.html5-qrcode-info,
#qr-reader > div > div:last-child,
#qr-reader [style*="position: absolute"][style*="top"][style*="right"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
}
</style>