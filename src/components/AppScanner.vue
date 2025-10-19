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

      <!-- Видео сканера - теперь используем Html5QrcodeScanner -->
      <div id="qr-reader" ref="qrReader" class="qr-reader-container"></div>

      <!-- Оверлей с рамкой - поверх Html5QrcodeScanner -->
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
let frameScanner = null; // Для сканирования кадров
let videoElement = null; // Ссылка на видео элемент

// Функция для подробного логирования
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString();
  const prefix = `[QR_SCANNER_DEBUG ${timestamp}]`;
  
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
};

// Функция для логирования ошибок
const errorLog = (message, error = null) => {
  const timestamp = new Date().toISOString();
  const prefix = `[QR_SCANNER_ERROR ${timestamp}]`;
  
  if (error) {
    console.error(prefix, message, error);
    console.error(prefix, 'Error stack:', error.stack);
  } else {
    console.error(prefix, message);
  }
};

// Автоматический запуск Html5QrcodeScanner при монтировании
onMounted(async () => {
  debugLog('🚀 Component mounted, starting initialization');
  debugLog('🌐 Environment info:', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    windowSize: { width: window.innerWidth, height: window.innerHeight },
    screenSize: { width: screen.width, height: screen.height }
  });
  
  // Показываем сообщение о загрузке сразу
  showMessageToUser('Запуск камеры...', 'info', 3000);
  
  // Убираем loader сканера
  walletStore.loaderScan = false;
  
  try {
    // Убираем любые отступы на уровне body и html для полноэкранного режима
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
    
    // Сохраняем оригинальные стили для восстановления
    window.originalBodyStyle = originalBodyStyle;
    window.originalHtmlStyle = originalHtmlStyle;
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        goBack();
      }
    };
    document.addEventListener('keydown', handleEscape);
    window.escapeHandler = handleEscape;
    
    // Сначала проверяем доступ к камере с упрощенными настройками
    try {
      debugLog('📱 Starting camera access check');
      
      // Улучшенная детекция Telegram WebApp
      const telegramWebApp = window.Telegram?.WebApp;
      const telegramUserAgent = navigator.userAgent.includes('Telegram');
      const telegramBot = navigator.userAgent.includes('TelegramBot');
      const telegramProxy = window.TelegramWebviewProxy;
      const externalNotify = window.external?.notify;
      const telegramReferrer = document.referrer.includes('telegram');
      
      const isTelegram = telegramWebApp || telegramUserAgent || telegramBot || telegramProxy || externalNotify || telegramReferrer;
      
      debugLog('🔍 Telegram detection results:', {
        telegramWebApp: !!telegramWebApp,
        telegramUserAgent,
        telegramBot,
        telegramProxy: !!telegramProxy,
        externalNotify: !!externalNotify,
        telegramReferrer,
        isTelegram,
        windowTelegram: !!window.Telegram,
        referrer: document.referrer
      });
      
      // Добавляем обработчик клика для активации видео в Telegram
      if (isTelegram) {
        debugLog('📲 Setting up Telegram video activation handlers');
        
        const activateVideo = () => {
          debugLog('👆 User interaction detected, attempting video activation');
          const video = document.querySelector('#qr-reader video');
          
          if (video) {
            debugLog('📹 Video element found:', {
              paused: video.paused,
              muted: video.muted,
              playsInline: video.playsInline,
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight
            });
            
            if (video.paused) {
              video.muted = true;
              video.playsInline = true;
              debugLog('📹 Attempting to play video with user interaction');
              
              video.play().then(() => {
                debugLog('✅ Video play successful after user interaction');
                showMessageToUser('Камера активирована', 'success', 2000);
                // Убираем обработчик после успешной активации
                document.removeEventListener('click', activateVideo);
                document.removeEventListener('touchstart', activateVideo);
              }).catch(err => {
                errorLog('❌ Video play failed after user interaction', err);
              });
            } else {
              debugLog('📹 Video is already playing');
            }
          } else {
            debugLog('❌ Video element not found during user interaction');
          }
        };
        
        // Добавляем обработчики для активации видео по клику
        document.addEventListener('click', activateVideo, { once: false });
        document.addEventListener('touchstart', activateVideo, { once: false });
        debugLog('📲 Telegram click handlers added');
        
        // Сохраняем для очистки при размонтировании
        window.telegramVideoActivator = activateVideo;
      }
      
      // Для Telegram используем максимально простые настройки
      const constraints = isTelegram ? {
        video: true // Самые простые настройки для Telegram
      } : {
        video: {
          facingMode: "environment",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      };
      
      debugLog('📹 Camera constraints:', constraints);
      debugLog('🔒 Requesting camera permissions...');
      
      // Проверяем доступность MediaDevices API
      if (!navigator.mediaDevices) {
        throw new Error('MediaDevices API not supported');
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      
      // Пытаемся получить доступ к камере
      // getUserMedia автоматически покажет системный запрос на разрешение
      debugLog('📹 Calling getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      debugLog('✅ Camera stream obtained:', {
        streamId: stream.id,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        }))
      });
      
      // Останавливаем тестовый поток сразу
      debugLog('🛑 Stopping test stream');
      stream.getTracks().forEach(track => {
        debugLog(`🛑 Stopping track: ${track.kind} - ${track.label}`);
        track.stop();
      });
      
      // Убираем сообщение загрузки
      hideMessage();
      
      // Инициализируем Html5QrcodeScanner и сразу запускаем сканер
      debugLog('🎯 Initializing scanner');
      initializeScanner();
      
      // Для Telegram увеличиваем задержку
      const delay = isTelegram ? 1000 : 100;
      debugLog(`⏱️ Starting scanner with ${delay}ms delay`);
      
      if (isTelegram) {
        setTimeout(() => startScanner(), 1000);
      } else {
        setTimeout(() => startScanner(), 100);
      }
      
    } catch (cameraError) {
      errorLog('❌ Camera initialization failed', cameraError);
      
      if (cameraError.name === 'NotAllowedError') {
        errorLog('🚫 Camera permission denied');
        showMessageToUser('Доступ к камере запрещен. Разрешите доступ к камере в настройках браузера.', 'error', 6000);
      } else if (cameraError.name === 'NotFoundError') {
        errorLog('📹 Camera not found');
        showMessageToUser('Камера не найдена. Убедитесь что камера подключена.', 'error', 6000);
      } else if (cameraError.name === 'NotSupportedError') {
        errorLog('🚫 Camera not supported');
        showMessageToUser('Камера не поддерживается на этом устройстве.', 'error', 6000);
      } else if (cameraError.message === 'MediaDevices API not supported') {
        errorLog('🚫 MediaDevices API not supported');
        showMessageToUser('Камера не поддерживается в этом браузере. Попробуйте открыть приложение в Chrome или Safari.', 'error', 8000);
      } else {
        errorLog('❓ Unknown camera error');
        showMessageToUser('Ошибка доступа к камере. Попробуйте обновить страницу.', 'error', 6000);
      }
    }
    
  } catch (error) {
    errorLog('❌ Mount error - unexpected error during initialization', error);
    showMessageToUser('Ошибка инициализации сканера', 'error', 4000);
  }
});

onBeforeUnmount(() => {
  try {
    // Очищаем обработчики для Telegram
    if (window.telegramVideoActivator) {
      document.removeEventListener('click', window.telegramVideoActivator);
      document.removeEventListener('touchstart', window.telegramVideoActivator);
      delete window.telegramVideoActivator;
    }
    
    // Восстанавливаем стили при выходе из компонента
    if (window.originalBodyStyle !== undefined) {
      document.body.style.cssText = window.originalBodyStyle;
      delete window.originalBodyStyle;
    }
    
    if (window.originalHtmlStyle !== undefined) {
      document.documentElement.style.cssText = window.originalHtmlStyle;
      delete window.originalHtmlStyle;
    }
    
    if (window.escapeHandler) {
      document.removeEventListener('keydown', window.escapeHandler);
      delete window.escapeHandler;
    }
    stopScanner();
  } catch (error) {
    // Игнорируем ошибки при размонтировании
  }
});

const initializeScanner = () => {
  debugLog('🎯 Initializing Html5QrcodeScanner');
  
  // Очищаем предыдущий сканер если есть
  if (scanner) {
    debugLog('🧹 Clearing previous scanner');
    try {
      scanner.clear();
    } catch (e) {
      errorLog('⚠️ Error clearing previous scanner', e);
    }
  }
  
  // Улучшенная детекция Telegram WebApp
  const isTelegram = window.Telegram?.WebApp || 
                   navigator.userAgent.includes('Telegram') ||
                   navigator.userAgent.includes('TelegramBot') ||
                   window.TelegramWebviewProxy ||
                   window.external?.notify ||
                   document.referrer.includes('telegram');
  
  // Упрощенные настройки - нам нужно только видео, сканирование делаем отдельно
  const config = {
    fps: 30, // Высокий FPS для плавного видео
    qrbox: { width: 250, height: 250 }, // Простая фиксированная область
    rememberLastUsedCamera: true,
    useBarCodeDetectorIfSupported: false, // Отключаем встроенное сканирование
    aspectRatio: 1.0,
    showTorchButtonIfSupported: false,
    showZoomSliderIfSupported: false,
    videoConstraints: isTelegram ? {
      video: true
    } : {
      facingMode: "environment",
      width: { ideal: 1280, min: 640 },
      height: { ideal: 720, min: 480 },
      frameRate: { ideal: 30, max: 30 }
    },
    disableFlip: true, // Отключаем зеркалирование
    verbose: false
  };
  
  debugLog('⚙️ Html5QrcodeScanner config:', config);

  try {
    debugLog('🏗️ Creating Html5QrcodeScanner instance');
    scanner = new Html5QrcodeScanner(
      "qr-reader",
      config,
      false
    );
    debugLog('✅ Html5QrcodeScanner created successfully');
    
  } catch (error) {
    errorLog('❌ Failed to create Html5QrcodeScanner', error);
    showMessageToUser('Ошибка инициализации сканера: ' + error.message, 'error', 5000);
  }
};

const startScanner = () => {
  debugLog('🚀 Starting scanner');
  
  if (isScanning) {
    debugLog('⚠️ Scanner already running, skipping start');
    return;
  }
  
  if (!scanner) {
    errorLog('❌ Scanner not initialized, cannot start');
    return;
  }
  
  const isTelegram = window.Telegram?.WebApp || navigator.userAgent.includes('Telegram');
  debugLog('📱 Telegram detected:', isTelegram);
  
  try {
    debugLog('🎬 Rendering Html5QrcodeScanner');
    // Запускаем Html5QrcodeScanner только для получения видеопотока
    scanner.render(
      (decodedText) => {
        debugLog('🎯 Built-in scanner detected QR (ignoring):', decodedText);
        // Отключаем встроенное сканирование, используем наше сканирование кадров
      },
      (errorMessage) => {
        debugLog('ℹ️ Built-in scanner error (expected):', errorMessage);
        // Игнорируем ошибки встроенного сканера
      }
    );
    
    isScanning = true;
    debugLog('✅ Scanner render called, isScanning = true');
    
    // Создаем наблюдатель для отслеживания появления видео элемента
    debugLog('👀 Setting up MutationObserver for video detection');
    videoObserver = new MutationObserver((mutations) => {
      debugLog('🔄 DOM mutation detected, checking for video');
      mutations.forEach((mutation) => {
        debugLog('🔄 Mutation details:', {
          type: mutation.type,
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length,
          target: mutation.target.tagName,
          targetId: mutation.target.id
        });
        
        if (mutation.type === 'childList') {
          const video = document.querySelector('#qr-reader video');
          debugLog('🎯 Video search result:', !!video);
          
          if (video && !video.dataset.configured) {
            debugLog('✅ New video element found and configuring');
            video.dataset.configured = 'true';
            videoElement = video;
            
            // Принудительно показываем видео только один раз
            forceShowVideo();
            
            // Запускаем сканирование кадров когда видео готово
            video.addEventListener('loadeddata', () => {
              debugLog('📹 Video data loaded, starting frame scanning');
              setTimeout(() => {
                startFrameScanning();
                showMessageToUser('Сканирование активно. Наведите камеру на QR-код', 'info', 2000);
              }, 1000);
            });
          } else if (video) {
            debugLog('ℹ️ Video element found but already configured');
          }
          
          // Скрываем UI элементы сразу после их создания
          hideHtml5QrcodeUI();
        }
      });
    });
    
    // Начинаем наблюдение за изменениями в qr-reader
    const qrReaderElement = document.getElementById('qr-reader');
    if (qrReaderElement) {
      debugLog('👀 Starting MutationObserver on #qr-reader');
      videoObserver.observe(qrReaderElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      // Проверим начальное состояние DOM
      debugLog('🔍 Initial #qr-reader state:', {
        children: qrReaderElement.children.length,
        innerHTML: qrReaderElement.innerHTML.substring(0, 200)
      });
    } else {
      errorLog('❌ #qr-reader element not found for MutationObserver');
    }
    
    // Автоматически нажимаем кнопку разрешения камеры если она появилась
    const tryClickPermissionButton = () => {
      const permissionButton = document.getElementById('html5-qrcode-button-camera-permission');
      if (permissionButton && permissionButton.style.display !== 'none') {
        permissionButton.click();
        return true;
      }
      return false;
    };
    
    // Быстрые попытки нажатия кнопки разрешения
    setTimeout(() => tryClickPermissionButton(), 100);
    setTimeout(() => tryClickPermissionButton(), 300);
    setTimeout(() => tryClickPermissionButton(), 500);
    
    // Дополнительные попытки для Telegram с увеличенными интервалами
    if (isTelegram) {
      setTimeout(() => tryClickPermissionButton(), 1000);
      setTimeout(() => tryClickPermissionButton(), 1500);
      setTimeout(() => tryClickPermissionButton(), 2000);
      setTimeout(() => tryClickPermissionButton(), 3000);
      
      // Принудительные попытки запуска видео
      setTimeout(() => forceShowVideo(), 2000);
      setTimeout(() => forceShowVideo(), 3000);
      setTimeout(() => forceShowVideo(), 5000);
      
      // Дополнительные попытки активации видео для Telegram
      setTimeout(() => {
        const video = document.querySelector('#qr-reader video');
        if (video && video.paused) {
          showMessageToUser('Нажмите на экран для запуска камеры', 'info', 5000);
        }
      }, 6000);
      
      // Повторная проверка каждые 10 секунд в течение минуты
      let attempts = 0;
      const maxAttempts = 6;
      const telegramVideoCheck = setInterval(() => {
        attempts++;
        const video = document.querySelector('#qr-reader video');
        if (video && video.paused && attempts < maxAttempts) {
          video.muted = true;
          video.playsInline = true;
          video.play().catch(() => {
            if (attempts === maxAttempts - 1) {
              showMessageToUser('Камера заблокирована. Обновите страницу или откройте в браузере.', 'error', 8000);
            }
          });
        } else if (attempts >= maxAttempts) {
          clearInterval(telegramVideoCheck);
        }
      }, 10000);
    }
    
    // Быстрое скрытие UI элементов
    setTimeout(() => {
      hideHtml5QrcodeUI();
    }, 200);
    
    // Расширенная проверка через временные интервалы
    setTimeout(() => {
      debugLog('🕐 1-second check: examining scanner state');
      const qrReaderElement = document.getElementById('qr-reader');
      const video = document.querySelector('#qr-reader video');
      
      debugLog('🔍 Scanner state after 1 second:', {
        qrReaderExists: !!qrReaderElement,
        qrReaderContent: qrReaderElement ? qrReaderElement.innerHTML.substring(0, 300) : 'N/A',
        videoExists: !!video,
        isScanning: isScanning,
        scannerExists: !!scanner
      });
      
      if (video && !video.dataset.stylesApplied) {
        debugLog('📹 Found unstyled video, applying styles');
        forceShowVideo();
      } else if (!video) {
        debugLog('❌ No video element found after 1 second');
      }
    }, 1000);
    
    // Дополнительные проверки для Telegram
    if (isTelegram) {
      setTimeout(() => {
        debugLog('🕕 5-second Telegram check');
        const qrReaderElement = document.getElementById('qr-reader');
        debugLog('📋 QR Reader after 5 seconds:', {
          innerHTML: qrReaderElement ? qrReaderElement.innerHTML : 'Element not found'
        });
        
        // Попытка принудительного рендера
        if (scanner && qrReaderElement && !document.querySelector('#qr-reader video')) {
          debugLog('🔧 Attempting to force Html5QrcodeScanner render');
          try {
            scanner.clear();
            setTimeout(() => {
              scanner.render(() => {}, () => {});
            }, 500);
          } catch (e) {
            errorLog('❌ Force render failed', e);
          }
        }
      }, 5000);
    }
    
    // Уменьшаем интервал мониторинга видео для быстрого отклика
    const videoMonitoring = setInterval(() => {
      // Только скрываем UI элементы, не трогаем видео постоянно
      hideHtml5QrcodeUI();
    }, 3000); // Увеличили интервал до 3 секунд
    
    // Сохраняем интервал для очистки при остановке сканера
    window.videoMonitoringInterval = videoMonitoring;
        
  } catch (error) {
    errorLog('❌ Scanner start failed', error);
    showMessageToUser('Ошибка запуска сканера', 'error', 4000);
    isScanning = false;
  }
};// Функция для захвата кадра из видео и его сканирования
const captureAndScanFrame = async () => {
  if (!videoElement || videoElement.readyState !== 4) {
    return; // Видео не готово
  }
  
  try {
    // Создаем canvas для захвата кадра
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Устанавливаем размеры canvas равными размерам видео
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    
    // Рисуем текущий кадр видео на canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Конвертируем canvas в blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      try {
        // Создаем временный элемент для сканирования
        const tempDiv = document.createElement('div');
        tempDiv.id = 'temp-frame-scan-region';
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        // Используем Html5Qrcode для сканирования кадра
        const { Html5Qrcode } = await import('html5-qrcode');
        const html5QrCode = new Html5Qrcode('temp-frame-scan-region');
        
        // Создаем File объект из blob
        const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
        
        // Сканируем кадр
        const result = await html5QrCode.scanFile(file, true);
        
        // Если QR-код найден, обрабатываем результат
        if (result) {
          onScanSuccess(result);
        }
        
        // Очищаем временный элемент
        await html5QrCode.clear();
        if (document.getElementById('temp-frame-scan-region')) {
          document.body.removeChild(tempDiv);
        }
        
      } catch (scanError) {
        // QR-код не найден в кадре - это нормально, просто продолжаем
        
        // Очищаем временный элемент в случае ошибки
        const tempDiv = document.getElementById('temp-frame-scan-region');
        if (tempDiv) {
          try {
            if (frameScanner) {
              await frameScanner.clear();
            }
          } catch (e) {
            // Игнорируем ошибки очистки
          }
          document.body.removeChild(tempDiv);
        }
      }
    }, 'image/jpeg', 0.8);
    
  } catch (error) {
    // Игнорируем ошибки захвата кадра
  }
};

// Запускаем сканирование кадров
const startFrameScanning = () => {
  if (frameScanner) {
    clearInterval(frameScanner);
  }
  
  // Сканируем кадры каждые 300ms для быстрого отклика
  frameScanner = setInterval(() => {
    if (isScanning && videoElement && videoElement.readyState === 4) {
      captureAndScanFrame();
    }
  }, 300);
};

// Останавливаем сканирование кадров  
const stopFrameScanning = () => {
  if (frameScanner) {
    clearInterval(frameScanner);
    frameScanner = null;
  }
};
const forceShowVideo = () => {
  debugLog('🎬 forceShowVideo called');
  
  // Подробное логирование состояния DOM
  const qrReaderElement = document.getElementById('qr-reader');
  debugLog('🔍 DOM state:', {
    qrReaderExists: !!qrReaderElement,
    qrReaderChildren: qrReaderElement ? qrReaderElement.children.length : 0,
    qrReaderInnerHTML: qrReaderElement ? qrReaderElement.innerHTML.substring(0, 200) : 'N/A'
  });
  
  // Ищем все возможные видео элементы
  const allVideos = document.querySelectorAll('video');
  debugLog('📹 All video elements found:', allVideos.length);
  allVideos.forEach((vid, index) => {
    debugLog(`📹 Video ${index}:`, {
      id: vid.id,
      className: vid.className,
      src: vid.src,
      srcObject: !!vid.srcObject,
      parent: vid.parentElement?.tagName,
      parentId: vid.parentElement?.id
    });
  });
  
  const video = document.querySelector('#qr-reader video');
  debugLog('🎯 Target video found:', !!video);
  
  if (video) {
    debugLog('📹 Video element found:', {
      paused: video.paused,
      muted: video.muted,
      playsInline: video.playsInline,
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      currentTime: video.currentTime,
      duration: video.duration,
      networkState: video.networkState,
      src: video.src || video.srcObject?.id
    });
    
    // Сохраняем ссылку на видео элемент для сканирования кадров
    videoElement = video;
    
    // Проверяем, нужно ли обновлять стили
    if (video.dataset.stylesApplied === 'true') {
      debugLog('🎨 Video styles already applied, skipping');
      return true; // Стили уже применены, не трогаем
    }
    
    // Специальная обработка для Telegram WebApp
    const isTelegram = window.Telegram?.WebApp || 
                     navigator.userAgent.includes('Telegram') ||
                     navigator.userAgent.includes('TelegramBot') ||
                     window.TelegramWebviewProxy ||
                     window.external?.notify ||
                     document.referrer.includes('telegram');
    
    // Обработчики событий для отладки и принудительного воспроизведения в Telegram
    if (isTelegram) {
      // Добавляем обработчики только один раз
      if (!video.dataset.telegramHandlersAdded) {
        video.addEventListener('loadstart', () => {
          debugLog('📹 [TELEGRAM] Video: load started');
        });
        
        video.addEventListener('loadedmetadata', () => {
          debugLog('📹 [TELEGRAM] Video: metadata loaded', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            duration: video.duration,
            readyState: video.readyState,
            networkState: video.networkState
          });
          // Принудительно запускаем после загрузки метаданных
          if (video.paused) {
            video.muted = true;
            video.playsInline = true;
            video.autoplay = true;
            debugLog('📹 [TELEGRAM] Attempting play after metadata');
            video.play().catch(err => errorLog('❌ [TELEGRAM] Play after metadata failed', err));
          }
        });
        
        video.addEventListener('loadeddata', () => {
          debugLog('📹 [TELEGRAM] Video: data loaded');
          // Еще одна попытка запуска
          if (video.paused) {
            video.muted = true;
            video.playsInline = true;
            debugLog('📹 [TELEGRAM] Attempting play after data loaded');
            video.play().catch(err => errorLog('❌ [TELEGRAM] Play after data failed', err));
          }
        });
        
        video.addEventListener('canplay', () => {
          debugLog('📹 [TELEGRAM] Video: can start playing');
          if (video.paused) {
            debugLog('📹 [TELEGRAM] Attempting play on canplay');
            video.play().catch(err => errorLog('❌ [TELEGRAM] Play on canplay failed', err));
          }
        });
        
        video.addEventListener('playing', () => {
          debugLog('✅ [TELEGRAM] Video: is playing successfully!');
          showMessageToUser('Камера активна', 'success', 2000);
        });
        
        video.addEventListener('pause', () => {
          debugLog('⏸️ [TELEGRAM] Video: paused');
          // Пытаемся снова запустить если видео было приостановлено
          setTimeout(() => {
            if (video.paused) {
              debugLog('📹 [TELEGRAM] Attempting resume after pause');
              video.play().catch(err => errorLog('❌ [TELEGRAM] Resume failed', err));
            }
          }, 500);
        });
        
        video.addEventListener('error', (e) => {
          errorLog('❌ [TELEGRAM] Video error occurred', {
            error: e.target.error,
            code: e.target.error?.code,
            message: e.target.error?.message,
            networkState: video.networkState,
            readyState: video.readyState
          });
          showMessageToUser('Ошибка воспроизведения видео. Попробуйте открыть в браузере.', 'error', 5000);
        });
        
        video.addEventListener('stalled', () => {
          debugLog('⏳ [TELEGRAM] Video: stalled, attempting restart');
          if (video.paused) {
            video.play().catch(err => errorLog('❌ [TELEGRAM] Restart failed', err));
          }
        });
        
        video.addEventListener('waiting', () => {
          debugLog('⏳ [TELEGRAM] Video: waiting for data');
        });
        
        video.addEventListener('emptied', () => {
          debugLog('�️ [TELEGRAM] Video: emptied');
        });
        
        video.addEventListener('ended', () => {
          debugLog('🏁 [TELEGRAM] Video: ended');
        });
        
        video.addEventListener('abort', () => {
          debugLog('🛑 [TELEGRAM] Video: aborted');
        });
        
        video.addEventListener('suspend', () => {
          debugLog('⏸️ [TELEGRAM] Video: suspended');
        });
        
        video.dataset.telegramHandlersAdded = 'true';
      }
      
      // Устанавливаем важные атрибуты для Telegram
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('autoplay', 'true');
      
      // Принудительная попытка запуска для Telegram
      if (video.paused) {
        video.play().catch(err => {
          console.log('Initial Telegram play failed:', err);
          // Еще одна попытка через таймаут
          setTimeout(() => {
            if (video.paused) {
              video.play().catch(err2 => {
                console.log('Second Telegram play failed:', err2);
                showMessageToUser('Нажмите на экран для активации камеры', 'info', 4000);
              });
            }
          }, 1000);
        });
      }
    }
    
    // Убираем все возможные скрывающие стили и принудительно показываем видео
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
      border: none !important;
      outline: none !important;
      margin: 0 !important;
      padding: 0 !important;
      transform: none !important;
      filter: none !important;
      min-width: 100vw !important;
      min-height: 100vh !important;
      max-width: none !important;
      max-height: none !important;
    `;
    
    // Отмечаем что стили применены
    video.dataset.stylesApplied = 'true';
    
    // Также принудительно настраиваем контейнер видео
    const videoContainer = video.parentElement;
    if (videoContainer && !videoContainer.dataset.stylesApplied) {
      videoContainer.style.cssText = `
        display: block !important;
        width: 100vw !important;
        height: 100vh !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 1 !important;
        visibility: visible !important;
        opacity: 1 !important;
        background: black !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      `;
      videoContainer.dataset.stylesApplied = 'true';
    }
    
    // Убеждаемся что canvas для QR детекции тоже видимый
    const canvas = document.querySelector('#qr-reader canvas');
    if (canvas && !canvas.dataset.stylesApplied) {
      canvas.style.cssText = `
        display: block !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 2 !important;
        pointer-events: none !important;
        visibility: visible !important;
        opacity: 1 !important;
      `;
      canvas.dataset.stylesApplied = 'true';
    }
    
    return true;
  } else {
    errorLog('❌ Video element not found in #qr-reader');
    
    // Дополнительная диагностика
    debugLog('🔍 Detailed DOM inspection:');
    if (qrReaderElement) {
      debugLog('📋 QR Reader element details:', {
        tagName: qrReaderElement.tagName,
        id: qrReaderElement.id,
        classList: Array.from(qrReaderElement.classList),
        childElementCount: qrReaderElement.childElementCount,
        innerHTML: qrReaderElement.innerHTML
      });
      
      // Проверяем каждого ребенка
      Array.from(qrReaderElement.children).forEach((child, index) => {
        debugLog(`👶 Child ${index}:`, {
          tagName: child.tagName,
          id: child.id,
          className: child.className,
          hasVideo: child.querySelector('video') !== null
        });
      });
    }
    
    return false;
  }

// Скрываем элементы UI Html5QrcodeScanner
const hideHtml5QrcodeUI = () => {
  try {
    // Скрываем все элементы управления включая справочник
    const elementsToHide = [
      '#qr-reader__dashboard_section',
      '#qr-reader__camera_selection', 
      '#qr-reader__filescan_input',
      '#html5-qrcode-button-camera-permission',
      '#html5-qrcode-anchor-scan-type-change',
      '#qr-reader__dashboard',
      '#qr-reader__header_message',
      '#qr-shaded-region',
      // Скрываем справочник/помощь в правом верхнем углу
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
        element.style.opacity = '0';
      }
    });
    
    // Дополнительно скрываем все элементы с позиционированием в правом верхнем углу
    const rightTopElements = document.querySelectorAll('#qr-reader [style*="position"][style*="right"][style*="top"]');
    rightTopElements.forEach(element => {
      element.style.display = 'none';
      element.style.visibility = 'hidden';
      element.style.opacity = '0';
    });
    
    // Скрываем любые элементы с текстом "help", "info", "?"
    const allElements = document.querySelectorAll('#qr-reader *');
    allElements.forEach(element => {
      if (element.textContent && (element.textContent.includes('help') || element.textContent.includes('info') || element.textContent.includes('?'))) {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        element.style.opacity = '0';
      }
    });
    
    // Настраиваем scan region
    const scanRegion = document.querySelector('#qr-reader__scan_region');
    if (scanRegion) {
      scanRegion.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        visibility: visible !important;
        position: relative !important;
      `;
    }
    
    // Принудительно показываем видео только если его нет
    const video = document.querySelector('#qr-reader video');
    if (video && video.style.display === 'none') {
      forceShowVideo();
    }
    
  } catch (error) {
    // Игнорируем ошибки скрытия UI элементов
  }
};

const onScanSuccess = (decodedText) => {
  // Проверяем, что это похоже на платежный QR-код
  const isPaymentQR = decodedText && (
    decodedText.toLowerCase().includes('bitcoin:') ||
    decodedText.toLowerCase().includes('ethereum:') ||
    decodedText.toLowerCase().includes('ton:') ||
    decodedText.startsWith('0x') || // Ethereum адрес
    decodedText.match(/^[13][a-km-z1-9]{25,34}$/i) || // Bitcoin адрес
    decodedText.match(/^[A-Za-z0-9]{48}$/) || // TON адрес
    decodedText.includes('amount=') ||
    decodedText.includes('value=') ||
    decodedText.length > 20 // Общая проверка на длину адреса
  );
  
  scanResult.value = decodedText;
  
  if (isPaymentQR) {
    showMessageToUser('Платежный QR-код распознан!', 'success', 1500);
  } else {
    showMessageToUser('QR-код найден!', 'success', 1500);
  }
  
  walletStore.qrTake(decodedText);
};

const onScanFailure = (error) => {
  // Проверяем на критические ошибки доступа к камере
  if (error.includes('NotAllowedError') || error.includes('Permission denied')) {
    showMessageToUser('Доступ к камере запрещен. Разрешите доступ к камере в настройках браузера.', 'error', 5000);
  } else if (error.includes('NotFoundError') || error.includes('No camera found')) {
    showMessageToUser('Камера не найдена. Убедитесь что камера подключена.', 'error', 5000);
  } else if (error.includes('NotSupportedError')) {
    showMessageToUser('Сканирование QR не поддерживается в этом браузере.', 'error', 5000);
  }
  // Логируем только критические ошибки, игнорируем обычные ошибки распознавания
  else if (!error.includes('NotFoundException') && !error.includes('No MultiFormat Readers')) {
    // Критические ошибки сканирования
  }
  // Обычные ошибки сканирования игнорируем - это нормально когда нет QR кода в кадре
};

const manualScan = async () => {
  if (!isScanning) {
    showMessageToUser('Запуск сканера...', 'info', 2000);
    
    // Если сканер не инициализирован, инициализируем его
    if (!scanner) {
      initializeScanner();
    }
    
    startScanner();
  } else {
    // Если сканирование уже активно, просто показываем сообщение
    showMessageToUser('Сканирование активно, наведите камеру на QR-код', 'info', 2000);
  }
};

const scanFromImage = async () => {
  if (!selectedImage.value) return;

  showMessageToUser('Сканирование изображения...', 'info', 5000);
  
  try {
    // Создаем временный элемент для сканирования
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-scan-region';
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);
    
    // Используем Html5Qrcode для сканирования файла
    const { Html5Qrcode } = await import('html5-qrcode');
    const html5QrCode = new Html5Qrcode('temp-scan-region');
    
    try {
      // Конвертируем data URL в File объект
      const response = await fetch(selectedImage.value);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });
      
      const result = await html5QrCode.scanFile(file, true);
      handleImageQRResult(result);
      
    } catch (scanError) {
      showMessageToUser('QR-код не найден в изображении', 'error', 4000);
    } finally {
      // Очищаем временный элемент
      try {
        await html5QrCode.clear();
      } catch (e) {
        // Игнорируем ошибки очистки
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

const stopScanner = () => {
  debugLog('🛑 Stopping scanner');
  
  try {
    // Останавливаем сканирование кадров
    debugLog('🛑 Stopping frame scanning');
    stopFrameScanning();
    
    // Останавливаем мониторинг видео
    if (window.videoMonitoringInterval) {
      debugLog('🛑 Clearing video monitoring interval');
      clearInterval(window.videoMonitoringInterval);
      window.videoMonitoringInterval = null;
    }
    
    // Останавливаем наблюдатель первым делом
    if (videoObserver) {
      debugLog('🛑 Disconnecting video observer');
      videoObserver.disconnect();
      videoObserver = null;
    }
    
    // Останавливаем сканер
    if (scanner && isScanning) {
      debugLog('🛑 Clearing Html5QrcodeScanner');
      scanner.clear().catch((error) => {
        errorLog('⚠️ Error clearing scanner', error);
      });
      isScanning = false;
    } else {
      debugLog('ℹ️ Scanner not running or not initialized');
    }
    
    // Принудительно останавливаем все видео потоки
    const video = document.querySelector('#qr-reader video');
    if (video && video.srcObject) {
      debugLog('🛑 Stopping video tracks');
      const stream = video.srcObject;
      stream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          debugLog(`🛑 Stopping track: ${track.kind} - ${track.label}`);
          track.stop();
        }
      });
      video.srcObject = null;
      // Очищаем маркеры примененных стилей
      video.removeAttribute('data-styles-applied');
      video.removeAttribute('data-configured');
    }
    
    // Сбрасываем ссылку на видео элемент
    videoElement = null;
    debugLog('🧹 Video element reference cleared');
    
    // Очищаем маркеры для canvas
    const canvas = document.querySelector('#qr-reader canvas');
    if (canvas) {
      canvas.removeAttribute('data-styles-applied');
    }
    
    // Очищаем маркеры для контейнеров
    const containers = document.querySelectorAll('#qr-reader > div');
    containers.forEach(container => {
      container.removeAttribute('data-styles-applied');
    });
    
    // Очищаем DOM элемент
    const qrReaderElement = document.getElementById('qr-reader');
    if (qrReaderElement) {
      qrReaderElement.innerHTML = '';
    }
    
  } catch (error) {
    errorLog('⚠️ Error during scanner stop', error);
  }
  
  debugLog('✅ Scanner stopped successfully');
};

const toggleTorch = async () => {
  // Пытаемся найти видео элемент Html5QrcodeScanner
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

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Проверяем тип файла
  if (!file.type.startsWith('image/')) {
    showMessageToUser('Пожалуйста, выберите изображение', 'error', 3000);
    return;
  }

  // Проверяем размер файла (максимум 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showMessageToUser('Файл слишком большой. Максимальный размер: 10MB', 'error', 3000);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage.value = e.target.result;
  };
  reader.readAsDataURL(file);
  
  // Сбрасываем input
  event.target.value = '';
};

const clearImage = () => {
  selectedImage.value = null;
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

const goBack = () => {
  try {
    // Восстанавливаем оригинальные стили body и html
    if (window.originalBodyStyle !== undefined) {
      document.body.style.cssText = window.originalBodyStyle;
      delete window.originalBodyStyle;
    }
    
    if (window.originalHtmlStyle !== undefined) {
      document.documentElement.style.cssText = window.originalHtmlStyle;
      delete window.originalHtmlStyle;
    }
    
    // Останавливаем сканер
    stopScanner();
    
    // Очищаем состояние
    scanResult.value = null;
    showMessage.value = false;
    
    // Даем время для очистки ресурсов
    setTimeout(() => {
      router.push({ name: 'main' }).catch(() => {
        router.push('/').catch(() => {
          window.location.href = '/';
        });
      });
    }, 100);
    
  } catch (error) {
    // В случае ошибки, принудительно переходим на главную
    try {
      router.push('/');
    } catch {
      window.location.href = '/';
    }
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

/* Стили для Html5QrcodeScanner */
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

/* Скрываем лишние элементы Html5QrcodeScanner */
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

/* Агрессивные стили для видео Html5QrcodeScanner */
#qr-reader video,
#qr-reader video[style] {
  width: 100vw !important;
  height: 100vh !important;
  object-fit: cover !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 1 !important;
  background: black !important;
  border: none !important;
  outline: none !important;
  margin: 0 !important;
  padding: 0 !important;
  transform: none !important;
  filter: none !important;
  min-width: 100vw !important;
  min-height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
}

/* Убеждаемся что контейнер видео тоже видимый */
#qr-reader > div,
#qr-reader__scan_region,
#qr-reader__scan_region > div {
  width: 100vw !important;
  height: 100vh !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  position: relative !important;
  background: black !important;
}

/* Показываем canvas для QR детекции */
#qr-reader canvas {
  display: block !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 2 !important;
  pointer-events: none !important;
  visibility: visible !important;
  opacity: 1 !important;
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
  z-index: 100; /* Поверх видео Html5QrcodeScanner */
  pointer-events: none; /* Не блокируем взаимодействие с видео */
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
  z-index: 200; /* Поверх оверлея */
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
  z-index: 200; /* Поверх оверлея */
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

<!-- Глобальные стили для принудительного отображения видео -->
<style>
/* Принудительное отображение видео Html5QrcodeScanner */
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
  border: none !important;
  outline: none !important;
  margin: 0 !important;
  padding: 0 !important;
  transform: none !important;
  filter: none !important;
  min-width: 100vw !important;
  min-height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
}

/* Контейнеры для видео */
#qr-reader,
#qr-reader > div,
#qr-reader__scan_region {
  display: block !important;
  width: 100vw !important;
  height: 100vh !important;
  position: relative !important;
  visibility: visible !important;
  opacity: 1 !important;
  background: black !important;
  overflow: hidden !important;
}

/* Скрытие всех UI элементов Html5QrcodeScanner */
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