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

// Автоматический запуск Html5QrcodeScanner при монтировании
onMounted(async () => {
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
      // Улучшенная детекция Telegram WebApp
      const isTelegram = window.Telegram?.WebApp || 
                       navigator.userAgent.includes('Telegram') ||
                       navigator.userAgent.includes('TelegramBot') ||
                       window.TelegramWebviewProxy ||
                       window.external?.notify ||
                       document.referrer.includes('telegram');
      
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
      
      // Пытаемся получить доступ к камере
      // getUserMedia автоматически покажет системный запрос на разрешение
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Останавливаем тестовый поток сразу
      stream.getTracks().forEach(track => track.stop());
      
      // Убираем сообщение загрузки
      hideMessage();
      
      // Инициализируем Html5QrcodeScanner и сразу запускаем сканер
      initializeScanner();
      
      // Для Telegram увеличиваем задержку
      if (isTelegram) {
        setTimeout(() => startScanner(), 1000);
      } else {
        setTimeout(() => startScanner(), 100);
      }
      
    } catch (cameraError) {
      console.error('Camera error:', cameraError);
      
      if (cameraError.name === 'NotAllowedError') {
        showMessageToUser('Доступ к камере запрещен. Разрешите доступ к камере в настройках браузера.', 'error', 6000);
      } else if (cameraError.name === 'NotFoundError') {
        showMessageToUser('Камера не найдена. Убедитесь что камера подключена.', 'error', 6000);
      } else if (cameraError.message === 'MediaDevices API not supported') {
        showMessageToUser('Камера не поддерживается в этом браузере. Попробуйте открыть приложение в Chrome или Safari.', 'error', 8000);
      } else {
        showMessageToUser('Ошибка доступа к камере. Попробуйте обновить страницу.', 'error', 6000);
      }
    }
    
  } catch (error) {
    console.error('Mount error:', error);
    showMessageToUser('Ошибка инициализации сканера', 'error', 4000);
  }
});

onBeforeUnmount(() => {
  try {
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
  // Очищаем предыдущий сканер если есть
  if (scanner) {
    try {
      scanner.clear();
    } catch (e) {
      // Игнорируем ошибки очистки
    }
  }
  
  // Улучшенная детекция Telegram WebApp
  const isTelegram = window.Telegram?.WebApp || 
                   navigator.userAgent.includes('Telegram') ||
                   navigator.userAgent.includes('TelegramBot') ||
                   window.TelegramWebviewProxy ||
                   window.external?.notify ||
                   document.referrer.includes('telegram');
  
  const config = {
    fps: isTelegram ? 5 : 10, // Очень низкий FPS для Telegram
    qrbox: function(viewfinderWidth, viewfinderHeight) {
      // Большая область сканирования для лучшего распознавания
      let minEdgePercentage = 0.8;
      let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
      let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
      return {
        width: qrboxSize,
        height: qrboxSize
      };
    },
    rememberLastUsedCamera: true,
    // Для Telegram разрешаем все типы сканирования
    supportedScanTypes: isTelegram ? undefined : [0],
    useBarCodeDetectorIfSupported: false, // Отключаем везде
    aspectRatio: 1.0,
    showTorchButtonIfSupported: false,
    showZoomSliderIfSupported: false,
    videoConstraints: isTelegram ? {
      // Максимально простые настройки для Telegram
      video: true
    } : {
      facingMode: "environment",
      width: { ideal: 1280, min: 640 },
      height: { ideal: 720, min: 480 },
      frameRate: { ideal: 10, max: 15 }
    },
    // Отключаем экспериментальные функции
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: false
    },
    disableFlip: true, // Полностью отключаем зеркалирование
    verbose: false,
    // Специальные настройки для Telegram
    formatsToSupport: isTelegram ? undefined : [11] // QR_CODE
  };

  try {
    scanner = new Html5QrcodeScanner(
      "qr-reader",
      config,
      false // verbose = false чтобы скрыть лишние элементы UI
    );
    
  } catch (error) {
    showMessageToUser('Ошибка инициализации сканера: ' + error.message, 'error', 5000);
  }
};

const startScanner = () => {
  if (isScanning || !scanner) {
    return;
  }
  
  const isTelegram = window.Telegram?.WebApp || navigator.userAgent.includes('Telegram');
  
  try {
    scanner.render(
      (decodedText) => onScanSuccess(decodedText),
      (errorMessage) => onScanFailure(errorMessage)
    );
    
    isScanning = true;
    
    // Создаем наблюдатель для отслеживания появления видео элемента
    videoObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const video = document.querySelector('#qr-reader video');
          if (video && !video.dataset.configured) {
            video.dataset.configured = 'true';
            // Принудительно показываем видео только один раз
            forceShowVideo();
          }
          
          // Скрываем UI элементы сразу после их создания
          hideHtml5QrcodeUI();
        }
      });
    });
    
    // Начинаем наблюдение за изменениями в qr-reader
    const qrReaderElement = document.getElementById('qr-reader');
    if (qrReaderElement) {
      videoObserver.observe(qrReaderElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
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
    }
    
    // Быстрое скрытие UI элементов
    setTimeout(() => {
      hideHtml5QrcodeUI();
    }, 200);
    
    // Единичная проверка видео через 1 секунду
    setTimeout(() => {
      const video = document.querySelector('#qr-reader video');
      if (video && !video.dataset.stylesApplied) {
        forceShowVideo();
      }
    }, 1000);
    
    // Уменьшаем интервал мониторинга видео для быстрого отклика
    const videoMonitoring = setInterval(() => {
      // Только скрываем UI элементы, не трогаем видео постоянно
      hideHtml5QrcodeUI();
    }, 3000); // Увеличили интервал до 3 секунд
    
    // Сохраняем интервал для очистки при остановке сканера
    window.videoMonitoringInterval = videoMonitoring;
        
  } catch (error) {
    showMessageToUser('Ошибка запуска сканера', 'error', 4000);
    isScanning = false;
  }
};// Принудительное отображение видео
const forceShowVideo = () => {
  const video = document.querySelector('#qr-reader video');
  if (video) {
    // Проверяем, нужно ли обновлять стили
    if (video.dataset.stylesApplied === 'true') {
      return true; // Стили уже применены, не трогаем
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
    
    // Принудительно запускаем видео если оно приостановлено
    if (video.paused) {
      video.play().catch(() => {
        // Игнорируем ошибки автозапуска
      });
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
  }
  return false;
};

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
  
  // Быстро передаем результат в store и закрываем сканер
  setTimeout(() => {
    walletStore.qrTake(decodedText);
    goBack();
  }, 300);
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
  try {
    // Останавливаем мониторинг видео
    if (window.videoMonitoringInterval) {
      clearInterval(window.videoMonitoringInterval);
      window.videoMonitoringInterval = null;
    }
    
    // Останавливаем наблюдатель первым делом
    if (videoObserver) {
      videoObserver.disconnect();
      videoObserver = null;
    }
    
    // Останавливаем сканер
    if (scanner && isScanning) {
      scanner.clear().catch(() => {
        // Игнорируем ошибки очистки
      });
      isScanning = false;
    }
    
    // Принудительно останавливаем все видео потоки
    const video = document.querySelector('#qr-reader video');
    if (video && video.srcObject) {
      const stream = video.srcObject;
      stream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
      video.srcObject = null;
      // Очищаем маркеры примененных стилей
      video.removeAttribute('data-styles-applied');
      video.removeAttribute('data-configured');
    }
    
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
    // Игнорируем ошибки остановки
  }
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