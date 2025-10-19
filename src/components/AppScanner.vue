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

      <!-- Простое видео с камеры -->
      <video 
        ref="videoElement" 
        class="camera-video" 
        autoplay 
        playsinline 
        muted
        @loadedmetadata="onVideoLoaded"
      ></video>

      <!-- Оверлей с рамкой -->
      <div class="scanner-overlay">
        <div class="scan-frame">
          <span></span>
        </div>
        <div class="hint">
          <span v-if="cameraReady">Наведите камеру на QR-код для оплаты</span>
          <span v-else>Инициализация камеры...</span>
        </div>
      </div>

      <!-- Контролы -->
      <div class="controls">
        <!-- Кнопка выбора файла -->
        <label class="control-btn file-btn">
          <input type="file" accept="image/*" @change="handleFileUpload" hidden />
          <img src="../assets/picture.png" alt="">
        </label>

        <!-- Основная кнопка сканирования -->
        <button class="scan-button" @click="captureAndScanManual" :disabled="!cameraReady || isManualScanning">
          <div class="scan-button-circle" :class="{ scanning: isManualScanning }"></div>
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

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useWalletStore } from '@/stores/walletStore';
import QrScanner from 'qr-scanner';
import LoaderScanner from './LoaderScanner.vue';

const router = useRouter();
const { t } = useI18n();
const walletStore = useWalletStore();

// Refs для работы с видео
const videoElement = ref(null);
const qrScanner = ref(null);
const scanInterval = ref(null);

// Состояние сканнера
const cameraReady = ref(false);
const isManualScanning = ref(false);
const showMessage = ref(false);
const messageText = ref('');
const messageType = ref('info');
const torchEnabled = ref(false);
const isProcessingQR = ref(false); // Флаг для предотвращения дублирования обработки

// Функция для отображения сообщений
const showMessageWithType = (text, type = 'info', duration = 3000) => {
  messageText.value = text;
  messageType.value = type;
  showMessage.value = true;
  
  setTimeout(() => {
    hideMessage();
  }, duration);
};

const hideMessage = () => {
  showMessage.value = false;
};

// Инициализация камеры и сканнера
const initCamera = async () => {
  try {
    // Проверяем поддержку камеры
    const hasCamera = await QrScanner.hasCamera();
    
    if (!hasCamera) {
      throw new Error('Камера не найдена');
    }

    if (!videoElement.value) {
      throw new Error('Видео элемент не найден');
    }

    // Создаем QR-сканнер
    qrScanner.value = new QrScanner(
      videoElement.value,
      (result) => {
        handleQRDetected(result.data);
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: false,
        highlightCodeOutline: false,
        preferredCamera: 'environment', // Задняя камера
        maxScansPerSecond: 3, // Увеличиваем частоту сканирования
        calculateScanRegion: (video) => {
          // Определяем область сканирования в центре экрана
          const smallerDimension = Math.min(video.videoWidth, video.videoHeight);
          const scanSize = Math.round(0.7 * smallerDimension);
          const x = Math.round((video.videoWidth - scanSize) / 2);
          const y = Math.round((video.videoHeight - scanSize) / 2);
          return {
            x: x,
            y: y,
            width: scanSize,
            height: scanSize,
          };
        },
      }
    );

    await qrScanner.value.start();
    
    cameraReady.value = true;
    
    // Запускаем дополнительное принудительное сканирование
    setTimeout(() => {
      if (cameraReady.value) {
        startContinuousScanning();
      }
    }, 1000);

  } catch (error) {
    let errorMessage = 'Не удалось запустить сканнер';
    
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Доступ к камере запрещен. Разрешите доступ в настройках браузера';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'Камера не найдена';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'Ваш браузер не поддерживает доступ к камере';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Камера уже используется другим приложением';
    } else if (error.message.includes('Camera not found')) {
      errorMessage = 'Камера не найдена на устройстве';
    }
    
    showMessageWithType(errorMessage, 'error', 6000);
  }
};

// Тестовая функция для проверки работы QrScanner
const testQrScanner = async () => {
  try {
    // Проверяем поддержку камеры
    const hasCamera = await QrScanner.hasCamera();
    
    // Проверяем поддержку WebRTC
    const isWebRTCSupported = !!navigator.mediaDevices?.getUserMedia;
    
    return hasCamera && isWebRTCSupported;
  } catch (error) {
    return false;
  }
};
const onVideoLoaded = () => {
  // QrScanner управляет видео самостоятельно
};

// Сканирование из файла
const scanFromFile = async (file) => {
  try {
    const result = await QrScanner.scanImage(file, {
      returnDetailedScanResult: true,
    });
    
    return result.data;
  } catch (error) {
    return null;
  }
};

// Проверка, является ли строка корректной ссылкой для оплаты
const isValidPaymentUrl = (url) => {
  try {
    // Расширим критерии валидации
    if (!url || typeof url !== 'string') return false;
    
    // Проверяем различные форматы платежных QR-кодов
    const isValidUrl = url.startsWith('http://') || url.startsWith('https://');
    const hasCrypto = url.toLowerCase().includes('bitcoin:') || 
                     url.toLowerCase().includes('ethereum:') || 
                     url.toLowerCase().includes('ton:');
    const hasPaymentParams = url.includes('amount=') || 
                            url.includes('sum=') || 
                            url.includes('value=') ||
                            url.includes('pay') || 
                            url.includes('payment') ||
                            url.includes('invoice');
    
    // Принимаем любой QR-код длиннее 10 символов для тестирования
    const result = isValidUrl || hasCrypto || hasPaymentParams || url.length > 10;
    
    return result;
  } catch (error) {
    return false;
  }
};

// Обработка найденного QR-кода
const handleQRDetected = async (qrData) => {
  // Предотвращаем дублирование обработки
  if (isProcessingQR.value) {
    return;
  }
  
  try {
    isProcessingQR.value = true;
    
    if (!isValidPaymentUrl(qrData)) {
      showMessageWithType('QR-код найден, но не содержит данных для оплаты: ' + qrData.substring(0, 50), 'error', 5000);
      return;
    }
    
    // Останавливаем сканирование
    stopContinuousScanning();
    
    showMessageWithType('QR-код найден! Обрабатываем...', 'success', 2000);
    
    // Отправляем в store
    await walletStore.qrTake(qrData);
    
  } catch (error) {
    showMessageWithType('Ошибка обработки QR-кода', 'error');
    
    // Перезапускаем сканирование через 3 секунды
    setTimeout(() => {
      if (qrScanner.value && cameraReady.value) {
        qrScanner.value.start();
        startContinuousScanning();
      }
    }, 3000);
  } finally {
    // Сбрасываем флаг через 2 секунды
    setTimeout(() => {
      isProcessingQR.value = false;
    }, 2000);
  }
};
// Непрерывное сканирование управляется самим QrScanner
const startContinuousScanning = () => {
  // QrScanner уже сканирует автоматически при запуске
  
  // Добавляем дополнительный механизм принудительного сканирования
  if (scanInterval.value) {
    clearInterval(scanInterval.value);
  }
  
  scanInterval.value = setInterval(async () => {
    if (!cameraReady.value || walletStore.loaderScan || isManualScanning.value || !qrScanner.value || isProcessingQR.value) {
      return;
    }
    
    try {
      // Принудительно пытаемся сканировать текущий кадр
      const video = videoElement.value;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });
        
        if (blob) {
          try {
            const result = await QrScanner.scanImage(blob, { returnDetailedScanResult: true });
            if (result && result.data) {
              handleQRDetected(result.data);
            }
          } catch (err) {
            // QR-код не найден, это нормально
          }
        }
      }
    } catch (error) {
      // Ошибки принудительного сканирования игнорируем
    }
  }, 2000); // Каждые 2 секунды
};

// Остановка сканирования
const stopContinuousScanning = () => {
  if (qrScanner.value) {
    qrScanner.value.stop();
  }
  
  if (scanInterval.value) {
    clearInterval(scanInterval.value);
    scanInterval.value = null;
  }
};

// Ручное сканирование (по кнопке) - делаем моментальный снимок
const captureAndScanManual = async () => {
  if (!cameraReady.value || isManualScanning.value || !qrScanner.value) {
    return;
  }

  isManualScanning.value = true;
  showMessageWithType('Сканирование...', 'info', 0);

  try {
    // Используем встроенную функцию QrScanner для захвата кадра
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const video = videoElement.value;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Конвертируем в blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
    
    const qrData = await QrScanner.scanImage(blob, { returnDetailedScanResult: true });
    
    if (qrData && qrData.data) {
      if (isValidPaymentUrl(qrData.data)) {
        showMessageWithType('QR-код распознан!', 'success', 2000);
        setTimeout(() => {
          handleQRDetected(qrData.data);
        }, 500);
      } else {
        showMessageWithType('QR-код найден, но не содержит данных для оплаты: ' + qrData.data.substring(0, 50), 'error', 5000);
      }
    } else {
      showMessageWithType('QR-код не найден. Попробуйте еще раз', 'error', 3000);
    }
  } catch (error) {
    showMessageWithType('QR-код не найден в кадре', 'error', 3000);
  } finally {
    isManualScanning.value = false;
  }
};

// Переключение фонарика
const toggleTorch = async () => {
  if (!qrScanner.value) return;

  try {
    const hasFlash = await qrScanner.value.hasFlash();
    
    if (hasFlash) {
      torchEnabled.value = !torchEnabled.value;
      await qrScanner.value.toggleFlash();
      showMessageWithType(torchEnabled.value ? 'Фонарик включен' : 'Фонарик выключен', 'info', 1000);
    } else {
      showMessageWithType('Фонарик не поддерживается', 'error');
    }
  } catch (error) {
    showMessageWithType('Ошибка фонарика', 'error');
  }
};

// Загрузка файла изображения
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Проверяем тип файла
  if (!file.type.startsWith('image/')) {
    showMessageWithType('Пожалуйста, выберите изображение', 'error', 3000);
    event.target.value = ''; // Сбрасываем input
    return;
  }

  // Проверяем размер файла (максимум 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showMessageWithType('Файл слишком большой. Максимальный размер 10MB', 'error', 3000);
    event.target.value = ''; // Сбрасываем input
    return;
  }

  // Сразу сканируем файл без показа превью
  showMessageWithType('Анализируем изображение...', 'info', 0);
  
  try {
    const qrData = await scanFromFile(file);
    
    if (qrData) {
      if (isValidPaymentUrl(qrData)) {
        showMessageWithType('QR-код распознан из изображения!', 'success', 2000);
        setTimeout(() => {
          handleQRDetected(qrData);
        }, 500);
      } else {
        showMessageWithType('QR-код найден, но не содержит данных для оплаты: ' + qrData.substring(0, 50), 'error', 5000);
      }
    } else {
      showMessageWithType('QR-код не найден в изображении', 'error', 3000);
    }
  } catch (error) {
    showMessageWithType('Ошибка анализа изображения: ' + error.message, 'error', 3000);
  }
  
  // Сбрасываем input для возможности повторной загрузки того же файла
  event.target.value = '';
};

// Остановка камеры и сканнера
const stopCamera = () => {
  stopContinuousScanning();
  
  if (qrScanner.value) {
    qrScanner.value.destroy();
    qrScanner.value = null;
  }
  
  cameraReady.value = false;
};

// Возврат назад
const goBack = () => {
  stopCamera();
  router.back();
};

// Lifecycle hooks
onMounted(async () => {
  // Тестируем QrScanner
  const qrScannerWorks = await testQrScanner();
  
  if (!qrScannerWorks) {
    showMessageWithType('Проблема с доступом к камере', 'error', 5000);
  }
  
  await nextTick();
  await initCamera();
});

onUnmounted(() => {
  stopCamera();
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

.camera-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
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
  color: white;
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

.hint span {
color: white;
}

.scanning-indicator {
  font-size: 12px;
  margin-top: 5px;
  opacity: 0.8;
  animation: scanPulse 2s ease-in-out infinite;
}

@keyframes scanPulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
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
  transition: all 0.3s ease;
}

.scan-button-circle.scanning {
  background: #4caf50;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
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

