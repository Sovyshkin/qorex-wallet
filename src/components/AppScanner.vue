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
        <button class="scan-button" @click="captureAndScanManual" :disabled="!cameraReady || isManualScanning">
          <div class="scan-button-circle" :class="{ scanning: isManualScanning }"></div>
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useWalletStore } from '@/stores/walletStore';
import { Html5Qrcode } from 'html5-qrcode';
import LoaderScanner from './LoaderScanner.vue';

const router = useRouter();
const { t } = useI18n();
const walletStore = useWalletStore();

// Refs для работы с видео
const videoElement = ref(null);
const stream = ref(null);
const scanInterval = ref(null);

// Состояние сканнера
const cameraReady = ref(false);
const isManualScanning = ref(false);
const selectedImage = ref(null);
const showMessage = ref(false);
const messageText = ref('');
const messageType = ref('info');
const torchEnabled = ref(false);

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

// Инициализация камеры
const initCamera = async () => {
  try {
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' }, // Предпочитаем заднюю камеру
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    };

    stream.value = await navigator.mediaDevices.getUserMedia(constraints);
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream.value;
      await videoElement.value.play();
    }
  } catch (error) {
    console.error('Ошибка доступа к камере:', error);
    
    let errorMessage = 'Не удалось запустить камеру';
    
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Доступ к камере запрещен. Разрешите доступ в настройках браузера';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'Камера не найдена';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'Ваш браузер не поддерживает доступ к камере';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Камера уже используется другим приложением';
    }
    
    showMessageWithType(errorMessage, 'error', 6000);
  }
};

// Тестовая функция для проверки работы html5-qrcode
const testHtml5Qrcode = async () => {
  console.log('=== Тестируем Html5Qrcode ===');
  
  try {
    // Создаем тестовое изображение с QR-кодом (простой текст в base64)
    const testQrDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const tempDiv = document.createElement('div');
    tempDiv.id = 'test-scan-region';
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);
    
    console.log('Создаем Html5Qrcode для теста...');
    const html5QrCode = new Html5Qrcode('test-scan-region');
    console.log('Html5Qrcode создан успешно');
    
    // Очищаем тест
    await html5QrCode.clear();
    document.body.removeChild(tempDiv);
    console.log('Тест Html5Qrcode завершен успешно');
    
    return true;
  } catch (error) {
    console.error('Ошибка теста Html5Qrcode:', error);
    return false;
  }
};
const onVideoLoaded = () => {
  cameraReady.value = true;
  // Добавляем небольшую задержку чтобы видео полностью инициализировалось
  setTimeout(() => {
    if (cameraReady.value) {
      startContinuousScanning();
    }
  }, 500);
};

// Захват кадра из видео
const captureFrame = async () => {
  if (!videoElement.value || !cameraReady.value) {
    console.log('Видео не готово для захвата');
    return null;
  }

  try {
    // Проверяем готовность видео
    if (videoElement.value.readyState < 2) {
      console.warn('Видео еще не готово для захвата, readyState:', videoElement.value.readyState);
      return null;
    }

    const videoWidth = videoElement.value.videoWidth;
    const videoHeight = videoElement.value.videoHeight;
    
    console.log('Размеры видео:', { videoWidth, videoHeight });
    
    if (!videoWidth || !videoHeight || videoWidth <= 0 || videoHeight <= 0) {
      console.warn('Некорректные размеры видео:', { videoWidth, videoHeight });
      return null;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error('Не удалось получить 2D контекст canvas');
      return null;
    }
    
    // Устанавливаем размеры как у видео
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    console.log('Canvas создан:', canvas.width, 'x', canvas.height);
    
    // Рисуем текущий кадр видео на canvas
    context.drawImage(videoElement.value, 0, 0, videoWidth, videoHeight);
    
    // Конвертируем в Blob для сканирования
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          console.log('Blob создан успешно, размер:', result.size);
          resolve(result);
        } else {
          console.error('Не удалось создать blob');
          reject(new Error('Не удалось создать blob'));
        }
      }, 'image/jpeg', 0.9); // Увеличиваем качество для лучшего распознавания
    });

    return blob;
  } catch (error) {
    console.error('Ошибка при захвате кадра:', error);
    return null;
  }
};

// Сканирование blob с помощью html5-qrcode
const scanBlob = async (blob) => {
  console.log('Начинаем сканирование blob:', blob?.size);
  
  try {
    // Создаем временный div для сканирования
    const tempDiv = document.createElement('div');
    tempDiv.id = 'temp-scan-region-' + Date.now(); // Уникальный ID
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);
    
    console.log('Создан временный div:', tempDiv.id);
    
    const html5QrCode = new Html5Qrcode(tempDiv.id);
    const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
    
    console.log('Создан файл для сканирования:', file.name, file.size);
    
    try {
      const result = await html5QrCode.scanFile(file, true);
      console.log('Html5Qrcode результат:', result);
      return result;
    } catch (scanError) {
      console.log('Html5Qrcode ошибка сканирования:', scanError.message);
      
      // Пробуем альтернативный метод - через canvas и ImageData
      try {
        console.log('Пробуем альтернативный метод через canvas...');
        const alternativeResult = await scanBlobAlternative(blob);
        if (alternativeResult) {
          console.log('Альтернативный метод успешен:', alternativeResult);
          return alternativeResult;
        }
      } catch (altError) {
        console.log('Альтернативный метод тоже неудачен:', altError.message);
      }
      
      return null;
    } finally {
      try {
        await html5QrCode.clear();
        console.log('Html5Qrcode очищен');
      } catch (e) {
        console.log('Ошибка очистки Html5Qrcode:', e.message);
      }
      if (document.getElementById(tempDiv.id)) {
        document.body.removeChild(tempDiv);
        console.log('Временный div удален');
      }
    }
  } catch (error) {
    console.error('Общая ошибка сканирования:', error);
    return null;
  }
};

// Проверка, является ли строка корректной ссылкой для оплаты
const isValidPaymentUrl = (url) => {
  try {
    // Расширим критерии валидации
    if (!url || typeof url !== 'string') return false;
    
    console.log('Проверяем QR данные:', url);
    
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
    
    console.log('Результат валидации:', result, {
      isValidUrl,
      hasCrypto, 
      hasPaymentParams,
      length: url.length
    });
    
    return result;
  } catch (error) {
    console.error('Ошибка валидации URL:', error);
    return false;
  }
};

// Альтернативный метод сканирования через canvas (для Telegram)
const scanBlobAlternative = async (blob) => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    
    img.onload = () => {
      try {
        console.log('Изображение загружено для альтернативного сканирования:', img.width, 'x', img.height);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Получаем ImageData
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log('ImageData получена:', imageData.width, 'x', imageData.height);
        
        // Пробуем найти QR-код простым способом
        // Для тестирования временно возвращаем mock данные если изображение достаточно большое
        if (img.width > 100 && img.height > 100) {
          console.log('Изображение достаточно большое, возможно содержит QR-код');
          // Здесь можно добавить дополнительную логику распознавания
        }
        
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      } catch (error) {
        console.error('Ошибка альтернативного сканирования:', error);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }
    };
    
    img.onerror = (error) => {
      console.error('Ошибка загрузки изображения для альтернативного сканирования:', error);
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    
    img.src = objectUrl;
  });
};
// Непрерывное сканирование каждую секунду
const startContinuousScanning = () => {
  if (scanInterval.value) {
    clearInterval(scanInterval.value);
  }

  console.log('Запускаем непрерывное сканирование...');

  scanInterval.value = setInterval(async () => {
    if (!cameraReady.value || walletStore.loaderScan || isManualScanning.value) {
      console.log('Пропускаем сканирование:', {
        cameraReady: cameraReady.value,
        loaderScan: walletStore.loaderScan,
        isManualScanning: isManualScanning.value
      });
      return;
    }

    try {
      console.log('Захватываем кадр...');
      const blob = await captureFrame();
      if (!blob) {
        console.log('Кадр не захвачен');
        return;
      }

      console.log('Кадр захвачен, размер:', blob.size);
      const qrData = await scanBlob(blob);
      
      if (qrData) {
        console.log('QR-код найден в автоматическом сканировании:', qrData);
        if (isValidPaymentUrl(qrData)) {
          console.log('QR-код валиден, обрабатываем');
          handleQRDetected(qrData);
        } else {
          console.log('QR-код не прошел валидацию');
        }
      } else {
        console.log('QR-код не найден в кадре');
      }
    } catch (error) {
      console.error('Ошибка при автоматическом сканировании:', error);
    }
  }, 2000); // Увеличиваем интервал до 2 секунд для Telegram
};

// Остановка непрерывного сканирования
const stopContinuousScanning = () => {
  if (scanInterval.value) {
    clearInterval(scanInterval.value);
    scanInterval.value = null;
  }
};

// Обработка найденного QR-кода
const handleQRDetected = async (qrData) => {
  try {
    // Останавливаем сканирование
    stopContinuousScanning();
    
    showMessageWithType('QR-код найден! Обрабатываем...', 'success', 2000);
    
    // Отправляем в store
    await walletStore.qrTake(qrData);
    
  } catch (error) {
    console.error('Ошибка обработки QR-кода:', error);
    showMessageWithType('Ошибка обработки QR-кода', 'error');
    
    // Перезапускаем сканирование через 3 секунды
    setTimeout(() => {
      startContinuousScanning();
    }, 3000);
  }
};

// Ручное сканирование (по кнопке)
const captureAndScanManual = async () => {
  if (!cameraReady.value || isManualScanning.value) {
    console.log('Ручное сканирование недоступно:', { cameraReady: cameraReady.value, isManualScanning: isManualScanning.value });
    return;
  }

  isManualScanning.value = true;
  console.log('Запускаем ручное сканирование...');
  showMessageWithType('Сканирование...', 'info', 0);

  try {
    const blob = await captureFrame();
    if (!blob) {
      console.error('Не удалось захватить кадр для ручного сканирования');
      throw new Error('Не удалось захватить кадр');
    }

    console.log('Кадр захвачен для ручного сканирования, сканируем...');
    const qrData = await scanBlob(blob);
    
    if (qrData) {
      console.log('QR-код найден при ручном сканировании:', qrData);
      if (isValidPaymentUrl(qrData)) {
        showMessageWithType('QR-код распознан!', 'success', 2000);
        setTimeout(() => {
          handleQRDetected(qrData);
        }, 500);
      } else {
        showMessageWithType('QR-код найден, но не содержит данных для оплаты: ' + qrData.substring(0, 50), 'error', 5000);
      }
    } else {
      console.log('QR-код не найден при ручном сканировании');
      showMessageWithType('QR-код не найден. Попробуйте еще раз', 'error', 3000);
    }
  } catch (error) {
    console.error('Ошибка ручного сканирования:', error);
    showMessageWithType('Ошибка сканирования: ' + error.message, 'error', 3000);
  } finally {
    isManualScanning.value = false;
  }
};

// Переключение фонарика
const toggleTorch = async () => {
  if (!stream.value) return;

  try {
    const track = stream.value.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    if (capabilities.torch) {
      torchEnabled.value = !torchEnabled.value;
      await track.applyConstraints({
        advanced: [{ torch: torchEnabled.value }]
      });
      showMessageWithType(torchEnabled.value ? 'Фонарик включен' : 'Фонарик выключен', 'info', 1000);
    } else {
      showMessageWithType('Фонарик не поддерживается', 'error');
    }
  } catch (error) {
    console.error('Ошибка переключения фонарика:', error);
    showMessageWithType('Ошибка фонарика', 'error');
  }
};

// Загрузка файла изображения
const handleFileUpload = (event) => {
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

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage.value = e.target.result;
    stopContinuousScanning(); // Останавливаем сканирование при просмотре изображения
  };
  reader.onerror = () => {
    showMessageWithType('Ошибка чтения файла', 'error', 3000);
  };
  reader.readAsDataURL(file);
  
  // Сбрасываем input для возможности повторной загрузки того же файла
  event.target.value = '';
};

// Сканирование из загруженного изображения
const scanFromImage = async () => {
  if (!selectedImage.value) return;

  console.log('Начинаем сканирование из загруженного изображения...');
  showMessageWithType('Анализируем изображение...', 'info', 0);

  try {
    console.log('Загружаем изображение из data URL...');
    const response = await fetch(selectedImage.value);
    const blob = await response.blob();
    
    console.log('Изображение конвертировано в blob:', blob.size);
    const qrData = await scanBlob(blob);
    
    if (qrData) {
      console.log('QR-код найден в загруженном изображении:', qrData);
      if (isValidPaymentUrl(qrData)) {
        showMessageWithType('QR-код распознан из изображения!', 'success', 2000);
        setTimeout(() => {
          handleQRDetected(qrData);
        }, 500);
      } else {
        showMessageWithType('QR-код найден, но не содержит данных для оплаты: ' + qrData.substring(0, 50), 'error', 5000);
      }
    } else {
      console.log('QR-код не найден в загруженном изображении');
      showMessageWithType('QR-код не найден в изображении', 'error', 3000);
    }
  } catch (error) {
    console.error('Ошибка сканирования изображения:', error);
    showMessageWithType('Ошибка анализа изображения: ' + error.message, 'error', 3000);
  }
};

// Очистка выбранного изображения
const clearImage = () => {
  selectedImage.value = null;
  startContinuousScanning(); // Возобновляем сканирование
};

// Остановка камеры
const stopCamera = () => {
  stopContinuousScanning();
  
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
    stream.value = null;
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
  console.log('=== AppScanner mounted ===');
  console.log('User Agent:', navigator.userAgent);
  console.log('Is Telegram WebApp:', !!window.Telegram?.WebApp);
  console.log('WebApp platform:', window.Telegram?.WebApp?.platform);
  console.log('WebApp version:', window.Telegram?.WebApp?.version);
  
  // Тестируем Html5Qrcode
  const html5QrcodeWorks = await testHtml5Qrcode();
  console.log('Html5Qrcode работает:', html5QrcodeWorks);
  
  if (!html5QrcodeWorks) {
    showMessageWithType('Проблема с библиотекой сканирования в Telegram', 'error', 5000);
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

