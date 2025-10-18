<template>
  <div class="app-scanner-container">
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
      <div class="controls">
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

<script>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useWalletStore } from "@/stores/walletStore";

export default {
  name: 'QrScannerTest',
  setup() {
    const router = useRouter();
    const walletStore = useWalletStore();
    const qrReader = ref(null);
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
      try {
        const handleEscape = (event) => {
          if (event.key === 'Escape') {
            goBack();
          }
        };
        document.addEventListener('keydown', handleEscape);
        window.escapeHandler = handleEscape;
        
        // Сначала проверяем доступ к камере с улучшенными настройками
        try {
          console.log('Testing camera access...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: "environment",
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 10, max: 15 }
            } 
          });
          
          // Логируем информацию о камере
          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack.getSettings();
          console.log('Camera settings:', settings);
          
          // Останавливаем тестовый поток
          stream.getTracks().forEach(track => track.stop());
          
          // Инициализируем Html5QrcodeScanner и сразу запускаем сканер
          initializeScanner();
          startScanner();
          
        } catch (cameraError) {
          if (cameraError.name === 'NotAllowedError') {
            showMessageToUser('Доступ к камере запрещен. Разрешите доступ к камере в настройках браузера.', 'error', 6000);
          } else if (cameraError.name === 'NotFoundError') {
            showMessageToUser('Камера не найдена. Убедитесь что камера подключена к устройству.', 'error', 6000);
          } else {
            showMessageToUser('Ошибка доступа к камере: ' + cameraError.message, 'error', 6000);
          }
        }
        
              } catch (error) {
        showMessageToUser('Ошибка инициализации сканера', 'error', 4000);
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

    const initializeScanner = () => {
      // Очищаем предыдущий сканер если есть
      if (scanner) {
        try {
          scanner.clear();
        } catch (e) {
          // Игнорируем ошибки очистки
        }
      }
      
      const config = {
        fps: 15, // Оптимальный FPS для QR-кодов оплаты
        qrbox: function(viewfinderWidth, viewfinderHeight) {
          // Увеличенная область сканирования для QR-кодов оплаты
          let minEdgePercentage = 0.8; // 80% от меньшей стороны для лучшего захвата
          let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        rememberLastUsedCamera: true,
        // Специализируемся только на QR-кодах для оплаты
        supportedScanTypes: [0], // 0 = QR_CODE, специально для платежных QR
        useBarCodeDetectorIfSupported: true,
        aspectRatio: 1.0, // Квадратное соотношение идеально для QR
        showTorchButtonIfSupported: false,
        showZoomSliderIfSupported: false,
        videoConstraints: {
          facingMode: "environment", // Задняя камера для сканирования
          width: { ideal: 1920, min: 1280 }, // HD качество для четкого распознавания
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 15, max: 20 }, // Стабильный frame rate
          focusMode: "continuous", // Постоянная фокусировка для четкости
          exposureMode: "continuous" // Автоматическая экспозиция
        },
        // Настройки специально для платежных QR-кодов
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        // Дополнительные настройки для финансовых QR
        disableFlip: false, // Разрешаем переворот изображения
        verbose: false // Отключаем лишние логи
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
            subtree: true
          });
        }
        
        // Автоматически нажимаем кнопку разрешения камеры если она появилась
        setTimeout(() => {
          const permissionButton = document.getElementById('html5-qrcode-button-camera-permission');
          if (permissionButton && permissionButton.style.display !== 'none') {
            permissionButton.click();
          }
        }, 500);
        
        // Скрываем элементы Html5QrcodeScanner UI через CSS
        setTimeout(() => {
          hideHtml5QrcodeUI();
        }, 1500);
        
        // Повторные проверки видео и повторное нажатие кнопки
        setTimeout(() => {
          const permissionButton = document.getElementById('html5-qrcode-button-camera-permission');
          if (permissionButton && permissionButton.style.display !== 'none') {
            permissionButton.click();
          }
          forceShowVideo();
        }, 2000);
        
        setTimeout(() => forceShowVideo(), 3000);
        setTimeout(() => forceShowVideo(), 5000);
        

        
      } catch (error) {
        showMessageToUser('Ошибка запуска сканера', 'error', 4000);
        isScanning = false;
      }
    };

    const stopScanner = () => {
      try {
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
        }
        
        // Очищаем DOM элемент
        const qrReaderElement = document.getElementById('qr-reader');
        if (qrReaderElement) {
          qrReaderElement.innerHTML = '';
        }
        
      } catch (error) {
        // Игнорируем ошибки остановки
      }
    };

    // Принудительное отображение видео
    const forceShowVideo = () => {
      const video = document.querySelector('#qr-reader video');
      if (video) {
        // Принудительно показываем видео
        video.style.cssText = `
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 1 !important;
          visibility: visible !important;
          opacity: 1 !important;
        `;
        
        // Проверяем состояние видео для диагностики
        if (video.videoWidth && video.videoHeight) {
          console.log(`Video stream active: ${video.videoWidth}x${video.videoHeight}`);
        } else {
          console.log('Video stream not ready yet...');
        }
        
        // Добавляем обработчик события загрузки метаданных
        video.addEventListener('loadedmetadata', () => {
          console.log(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
        });
        
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
          element.style.display = 'none !important';
          element.style.visibility = 'hidden';
          element.style.opacity = '0';
        });
        
        // Скрываем любые элементы с текстом "help", "info", "?"
        const allElements = document.querySelectorAll('#qr-reader *');
        allElements.forEach(element => {
          const text = element.textContent || element.innerHTML || '';
          if (text.includes('?') || text.toLowerCase().includes('help') || text.toLowerCase().includes('info')) {
            if (element.tagName !== 'VIDEO' && element.tagName !== 'CANVAS') {
              element.style.display = 'none';
              element.style.visibility = 'hidden';
            }
          }
        });
        
        // Настраиваем scan region
        const scanRegion = document.querySelector('#qr-reader__scan_region');
        if (scanRegion) {
          scanRegion.style.cssText = `
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          `;
        }
        
        // Принудительно показываем видео
        if (!forceShowVideo()) {
          // Если видео не найдено, ждем еще немного
          setTimeout(() => {
            forceShowVideo();
          }, 500);
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
        console.log('QR Scan error:', error);
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
    
    const scanFromImageFile = async (file) => {
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
      
      // Передаем результат в store и закрываем сканер
      setTimeout(() => {
        walletStore.qrTake(qrData);
        goBack();
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

      // Сразу сканируем файл после выбора
      scanFromImageFile(file);
      
      // Сбрасываем input
      event.target.value = '';
    };

    const clearImage = () => {
      selectedImage.value = null;
    };

    const goBack = () => {
      try {
        // Останавливаем сканер
        stopScanner();
        
        // Очищаем состояние
        scanResult.value = null;
        showMessage.value = false;
        
        // Даем время для очистки ресурсов
        setTimeout(() => {
          // Переходим на main страницу
          router.push({ name: 'main' }).catch(() => {
            // Если роут не найден, пробуем альтернативные варианты
            router.push('/').catch(() => {
              // В крайнем случае, перезагружаем страницу
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

    return {
      qrReader,
      isTorchOn,
      scanResult,
      showMessage,
      messageText,
      messageType,
      manualScan,
      showMessageToUser,
      hideMessage,
      toggleTorch,
      handleFileUpload,
      goBack
    };
  }
};
</script>

<style scoped>
/* Стили из AppScanner.vue - полноэкранный дизайн */
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

/* Скрываем лишние элементы Html5QrcodeScanner включая справочник */
#qr-reader__dashboard_section,
#qr-reader__camera_selection,
#qr-reader__filescan_input,
#qr-reader__header_message,
#qr-shaded-region,
/* Скрываем справочник и элементы помощи */
.html5-qrcode-element,
[id*="html5-qrcode-help"],
[id*="qr-reader-help"],
[class*="help"],
[class*="info-button"],
.qr-code-help,
.html5-qrcode-info,
/* Скрываем любые элементы в правом верхнем углу Html5QrcodeScanner */
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
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 1 !important;
  background: black !important;
}

/* Убеждаемся что контейнер видео тоже видимый */
#qr-reader > div,
#qr-reader__scan_region,
#qr-reader__scan_region > div {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
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
  z-index: 10; /* Поверх Html5QrcodeScanner */
  pointer-events: none; /* Не блокируем взаимодействие с камерой */
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
  z-index: 20; /* Поверх всего */
  pointer-events: auto; /* Разрешаем взаимодействие с контролами */
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