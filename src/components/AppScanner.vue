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
    <div class="scanner-overlay">
      <div class="scan-frame">
        <span></span>
      </div>
      <div class="hint">{{ t('scanner_text') }}</div>
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
import { Html5Qrcode } from "html5-qrcode";
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
const messageType = ref('info'); // 'info', 'success', 'error'
let stream = null;
let scanningInterval = null;
let zxingReader = null;
let cachedCanvas = null;
let cachedCtx = null;

// Автоматический запуск камеры при монтировании
onMounted(async () => {
  try {
    walletStore.loaderScan = false;
    
    // Добавляем обработчик клавиши Escape
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        goBack();
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Сохраняем ссылку на обработчик для очистки
    window.escapeHandler = handleEscape;
    
    // Инициализируем ZXing reader с расширенными настройками
    try {
      zxingReader = new BrowserMultiFormatReader();
      // Настраиваем ZXing для лучшего распознавания
      zxingReader.hints.set(2, 3); // TRY_HARDER
      zxingReader.hints.set(3, true); // PURE_BARCODE
    } catch (error) {
      console.warn('Не удалось инициализировать ZXing reader:', error);
      zxingReader = null;
    }
    
    // Запрашиваем камеру с высоким разрешением и автофокусом
    const constraints = {
      video: {
        facingMode: "environment",
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1080, min: 480 },
        focusMode: "continuous",
        whiteBalanceMode: "continuous",
        exposureMode: "continuous"
      },
    };
    
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.value.srcObject = stream;
    
    // Ждем загрузки метаданных перед началом воспроизведения
    videoElement.value.addEventListener('loadedmetadata', () => {
      videoElement.value.play().then(() => {
        // Запускаем автоматическое сканирование только после успешного запуска видео
        setTimeout(() => {
          startAutoScanning();
        }, 500); // Небольшая задержка для стабилизации видеопотока
      });
    });
    
  } catch (error) {
    console.error("Ошибка доступа к камере:", error);
    // Fallback к базовым настройкам
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      videoElement.value.srcObject = stream;
      await videoElement.value.play();
      startAutoScanning();
    } catch (fallbackError) {
      console.error("Критическая ошибка камеры:", fallbackError);
    }
  }
});

// Остановка при размонтировании
onBeforeUnmount(() => {
  try {
    // Убираем обработчик Escape
    if (window.escapeHandler) {
      document.removeEventListener('keydown', window.escapeHandler);
      delete window.escapeHandler;
    }
    
    stopScanner();
  } catch (error) {
    console.error('Ошибка при размонтировании компонента:', error);
  }
});

// Функция автоматического сканирования
const startAutoScanning = () => {
  // Запускаем наше мульти-библиотечное сканирование
  scanningInterval = setInterval(() => {
    performScan();
  }, 150); // Частое сканирование для лучшей отзывчивости
};

// Функция остановки автоматического сканирования
const stopAutoScanning = () => {
  try {
    if (scanningInterval) {
      clearInterval(scanningInterval);
      scanningInterval = null;
    }
  } catch (error) {
    console.error('Ошибка в stopAutoScanning:', error);
  }
};

// Функция безопасного клонирования ImageData
const cloneImageData = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const clonedData = new Uint8ClampedArray(imageData.data);
  return {
    data: clonedData,
    width: imageData.width,
    height: imageData.height
  };
};

// Функция преобразования в оттенки серого
const convertToGrayscale = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const length = data.length;
  
  for (let i = 0; i < length; i += 4) {
    // Используем стандартную формулу luminance для оттенков серого
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;     // R
    data[i + 1] = gray; // G
    data[i + 2] = gray; // B
    // data[i + 3] остается без изменений (alpha)
  }
  
  return imageData;
};

// Функция билинейной интерполяции для масштабирования
const bilinearScale = (imageData, newWidth, newHeight) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const { data: srcData, width: srcWidth, height: srcHeight } = imageData;
  const newData = new Uint8ClampedArray(newWidth * newHeight * 4);
  
  const xRatio = srcWidth / newWidth;
  const yRatio = srcHeight / newHeight;
  
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      
      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      const x2 = Math.min(x1 + 1, srcWidth - 1);
      const y2 = Math.min(y1 + 1, srcHeight - 1);
      
      const dx = srcX - x1;
      const dy = srcY - y1;
      
      for (let c = 0; c < 4; c++) {
        const idx1 = (y1 * srcWidth + x1) * 4 + c;
        const idx2 = (y1 * srcWidth + x2) * 4 + c;
        const idx3 = (y2 * srcWidth + x1) * 4 + c;
        const idx4 = (y2 * srcWidth + x2) * 4 + c;
        
        const val1 = srcData[idx1] * (1 - dx) + srcData[idx2] * dx;
        const val2 = srcData[idx3] * (1 - dx) + srcData[idx4] * dx;
        const finalVal = val1 * (1 - dy) + val2 * dy;
        
        newData[(y * newWidth + x) * 4 + c] = Math.round(finalVal);
      }
    }
  }
  
  return {
    data: newData,
    width: newWidth,
    height: newHeight
  };
};

// Функция повышения резкости (Unsharp Mask)
const sharpenImage = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const newData = new Uint8ClampedArray(data.length);
  
  // Ядро для повышения резкости
  const kernel = [
    [ 0, -1,  0],
    [-1,  5, -1],
    [ 0, -1,  0]
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB каналы
        let sum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[ky + 1][kx + 1];
          }
        }
        
        const idx = (y * width + x) * 4 + c;
        newData[idx] = Math.max(0, Math.min(255, sum));
      }
      
      // Копируем альфа канал без изменений
      const alphaIdx = (y * width + x) * 4 + 3;
      newData[alphaIdx] = data[alphaIdx];
    }
  }
  
  // Копируем границы
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 4; c++) {
          newData[idx + c] = data[idx + c];
        }
      }
    }
  }
  
  return {
    data: newData,
    width: width,
    height: height
  };
};

// Функция адаптивного выравнивания гистограммы (CLAHE)
const claheEnhancement = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Размер тайла для локальной обработки
  const tileSize = 64;
  const clipLimit = 3.0;
  
  // Обрабатываем каждый тайл отдельно
  for (let tileY = 0; tileY < height; tileY += tileSize) {
    for (let tileX = 0; tileX < width; tileX += tileSize) {
      const tileEndY = Math.min(tileY + tileSize, height);
      const tileEndX = Math.min(tileX + tileSize, width);
      
      // Создаем гистограмму для тайла
      const histogram = new Array(256).fill(0);
      let pixelCount = 0;
      
      for (let y = tileY; y < tileEndY; y++) {
        for (let x = tileX; x < tileEndX; x++) {
          const idx = (y * width + x) * 4;
          const brightness = Math.round((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
          histogram[brightness]++;
          pixelCount++;
        }
      }
      
      // Применяем ограничение контрастности
      const clipValue = Math.floor(clipLimit * pixelCount / 256);
      let clippedPixels = 0;
      
      for (let i = 0; i < 256; i++) {
        if (histogram[i] > clipValue) {
          clippedPixels += histogram[i] - clipValue;
          histogram[i] = clipValue;
        }
      }
      
      // Перераспределяем обрезанные пиксели
      const redistributed = Math.floor(clippedPixels / 256);
      for (let i = 0; i < 256; i++) {
        histogram[i] += redistributed;
      }
      
      // Создаем кумулятивную функцию распределения
      const cdf = new Array(256);
      cdf[0] = histogram[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + histogram[i];
      }
      
      // Нормализуем CDF
      for (let i = 0; i < 256; i++) {
        cdf[i] = Math.round((cdf[i] * 255) / pixelCount);
      }
      
      // Применяем выравнивание к пикселям тайла
      for (let y = tileY; y < tileEndY; y++) {
        for (let x = tileX; x < tileEndX; x++) {
          const idx = (y * width + x) * 4;
          const brightness = Math.round((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
          const newBrightness = cdf[brightness];
          
          // Применяем новую яркость с сохранением цветового соотношения
          const ratio = newBrightness / Math.max(brightness, 1);
          data[idx] = Math.min(255, Math.round(data[idx] * ratio));
          data[idx + 1] = Math.min(255, Math.round(data[idx + 1] * ratio));
          data[idx + 2] = Math.min(255, Math.round(data[idx + 2] * ratio));
        }
      }
    }
  }
  
  return imageData;
};

// Функция поворота изображения на заданный угол
const rotateImage = (imageData, angle) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const { data, width, height } = imageData;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  // Вычисляем новые размеры
  const newWidth = Math.ceil(Math.abs(width * cos) + Math.abs(height * sin));
  const newHeight = Math.ceil(Math.abs(width * sin) + Math.abs(height * cos));
  
  const newData = new Uint8ClampedArray(newWidth * newHeight * 4);
  const centerX = width / 2;
  const centerY = height / 2;
  const newCenterX = newWidth / 2;
  const newCenterY = newHeight / 2;
  
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      // Обратное преобразование координат
      const relX = x - newCenterX;
      const relY = y - newCenterY;
      
      const srcX = Math.round(relX * cos + relY * sin + centerX);
      const srcY = Math.round(-relX * sin + relY * cos + centerY);
      
      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (y * newWidth + x) * 4;
        
        for (let c = 0; c < 4; c++) {
          newData[dstIdx + c] = data[srcIdx + c];
        }
      } else {
        // Заполняем белым цветом
        const dstIdx = (y * newWidth + x) * 4;
        newData[dstIdx] = 255;     // R
        newData[dstIdx + 1] = 255; // G
        newData[dstIdx + 2] = 255; // B
        newData[dstIdx + 3] = 255; // A
      }
    }
  }
  
  return {
    data: newData,
    width: newWidth,
    height: newHeight
  };
};

// Функция детекции и коррекции перспективы (упрощенная)
const correctPerspective = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  // Упрощенная коррекция перспективы через поиск контуров
  const { data, width, height } = imageData;
  
  // Находим края изображения с помощью оператора Собеля
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  const sobelY = [
    [-1, -2, -1],
    [ 0,  0,  0],
    [ 1,  2,  1]
  ];
  
  const edges = new Array(width * height).fill(0);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          gx += brightness * sobelX[ky + 1][kx + 1];
          gy += brightness * sobelY[ky + 1][kx + 1];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude;
    }
  }
  
  // Применяем коррекцию наклона (простое выравнивание)
  const threshold = 50;
  let sumAngle = 0;
  let angleCount = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (edges[y * width + x] > threshold) {
        // Вычисляем градиент направления
        const gx = edges[y * width + x + 1] - edges[y * width + x - 1];
        const gy = edges[(y + 1) * width + x] - edges[(y - 1) * width + x];
        
        if (Math.abs(gx) > 10) {
          const angle = Math.atan2(gy, gx);
          sumAngle += angle;
          angleCount++;
        }
      }
    }
  }
  
  if (angleCount > 0) {
    const avgAngle = sumAngle / angleCount;
    const degrees = (avgAngle * 180) / Math.PI;
    
    // Корректируем только если угол значительный
    if (Math.abs(degrees) > 2 && Math.abs(degrees) < 45) {
      return rotateImage(imageData, -degrees);
    }
  }
  
  return imageData;
};

// Функция автоматической коррекции яркости и контрастности
const autoAdjustBrightnessContrast = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const length = data.length;
  
  // Анализируем гистограмму для определения оптимальной коррекции
  let histogram = new Array(256).fill(0);
  let totalPixels = 0;
  let sumBrightness = 0;
  
  for (let i = 0; i < length; i += 4) {
    const brightness = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
    histogram[brightness]++;
    sumBrightness += brightness;
    totalPixels++;
  }
  
  const avgBrightness = sumBrightness / totalPixels;
  
  // Определяем нужную коррекцию
  let brightnessFactor = 1.0;
  let contrastFactor = 1.0;
  
  if (avgBrightness < 80) {
    // Слишком темное изображение
    brightnessFactor = 1.5;
    contrastFactor = 1.3;
  } else if (avgBrightness > 180) {
    // Слишком светлое изображение
    brightnessFactor = 0.7;
    contrastFactor = 1.4;
  } else {
    // Нормальная яркость, но можем улучшить контраст
    contrastFactor = 1.2;
  }
  
  // Применяем коррекцию
  for (let i = 0; i < length; i += 4) {
    for (let c = 0; c < 3; c++) { // RGB каналы
      let pixel = data[i + c];
      
      // Коррекция яркости
      pixel = pixel * brightnessFactor;
      
      // Коррекция контрастности
      pixel = ((pixel - 128) * contrastFactor) + 128;
      
      // Ограничиваем значения
      data[i + c] = Math.max(0, Math.min(255, pixel));
    }
  }
  
  return imageData;
};

// Функция удаления шума методом медианной фильтрации
const medianFilter = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const newData = new Uint8ClampedArray(data.length);
  
  // Копируем исходные данные
  for (let i = 0; i < data.length; i++) {
    newData[i] = data[i];
  }
  
  // Применяем медианный фильтр 3x3
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB каналы
        const values = [];
        
        // Собираем значения из окна 3x3
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4 + c;
            values.push(data[idx]);
          }
        }
        
        // Сортируем и берем медиану
        values.sort((a, b) => a - b);
        const medianValue = values[4]; // Медиана из 9 элементов
        
        const idx = (y * width + x) * 4 + c;
        newData[idx] = medianValue;
      }
      
      // Копируем альфа канал
      const alphaIdx = (y * width + x) * 4 + 3;
      newData[alphaIdx] = data[alphaIdx];
    }
  }
  
  return {
    data: newData,
    width: width,
    height: height
  };
};

// Функция улучшения контрастности
const enhanceContrast = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const length = data.length;
  
  // Находим мин/макс значения для растягивания гистограммы
  let min = 255, max = 0;
  for (let i = 0; i < length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness < min) min = brightness;
    if (brightness > max) max = brightness;
  }
  
  // Избегаем деления на ноль
  if (max === min) return imageData;
  
  const contrast = 255 / (max - min);
  
  for (let i = 0; i < length; i += 4) {
    // Применяем к каждому каналу
    for (let j = 0; j < 3; j++) {
      const index = i + j;
      data[index] = Math.max(0, Math.min(255, (data[index] - min) * contrast));
    }
  }
  
  return imageData;
};

// Функция бинаризации (черно-белое)
const binarizeImage = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const length = data.length;
  
  // Вычисляем порог автоматически (метод Оцу)
  let histogram = new Array(256).fill(0);
  for (let i = 0; i < length; i += 4) {
    const brightness = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
    histogram[brightness]++;
  }
  
  let total = length / 4;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }
  
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 128; // значение по умолчанию
  
  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    
    wF = total - wB;
    if (wF === 0) break;
    
    sumB += i * histogram[i];
    
    let mB = sumB / wB;
    let mF = (sum - sumB) / wF;
    
    let variance = wB * wF * (mB - mF) * (mB - mF);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }
  
  // Применяем порог
  for (let i = 0; i < length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const value = brightness > threshold ? 255 : 0;
    
    data[i] = value;     // R
    data[i + 1] = value; // G
    data[i + 2] = value; // B
  }
  
  return imageData;
};

// Функция размытия по Гауссу для уменьшения шума
const applyGaussianBlur = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const newData = new Uint8ClampedArray(data.length);
  
  // Копируем исходные данные
  for (let i = 0; i < data.length; i++) {
    newData[i] = data[i];
  }
  
  // Простое ядро размытия 3x3
  const kernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ];
  const kernelSum = 16;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const weight = kernel[ky + 1][kx + 1];
          
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
        }
      }
      
      const idx = (y * width + x) * 4;
      newData[idx] = Math.round(r / kernelSum);
      newData[idx + 1] = Math.round(g / kernelSum);
      newData[idx + 2] = Math.round(b / kernelSum);
      newData[idx + 3] = data[idx + 3]; // альфа канал остается без изменений
    }
  }
  
  // Создаем новый ImageData объект правильно
  const result = {
    data: newData,
    width: width,
    height: height
  };
  
  return result;
};

// Функция адаптивной бинаризации
const adaptiveBinarization = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const windowSize = 15; // Размер окна для адаптивной бинаризации
  const c = 7; // Константа, вычитаемая из среднего
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Вычисляем среднее значение в окне
      let sum = 0;
      let count = 0;
      
      for (let dy = -Math.floor(windowSize/2); dy <= Math.floor(windowSize/2); dy++) {
        for (let dx = -Math.floor(windowSize/2); dx <= Math.floor(windowSize/2); dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const nIdx = (ny * width + nx) * 4;
            const brightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
            sum += brightness;
            count++;
          }
        }
      }
      
      const mean = sum / count;
      const threshold = mean - c;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const value = brightness > threshold ? 255 : 0;
      
      data[idx] = value;     // R
      data[idx + 1] = value; // G
      data[idx + 2] = value; // B
    }
  }
  
  return imageData;
};

// Функция морфологических операций (эрозия и дилатация)
const morphologyOperations = (imageData) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  // Сначала применяем бинаризацию
  const binary = binarizeImage(cloneImageData(imageData));
  if (!binary) return null;
  
  const data = binary.data;
  const width = binary.width;
  const height = binary.height;
  const newData = new Uint8ClampedArray(data.length);
  
  // Структурный элемент 3x3
  const kernel = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],  [0, 0],  [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  // Эрозия (удаляет шум)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      let minValue = 255;
      
      for (const [ky, kx] of kernel) {
        const ny = y + ky;
        const nx = x + kx;
        const nIdx = (ny * width + nx) * 4;
        minValue = Math.min(minValue, data[nIdx]);
      }
      
      newData[idx] = minValue;
      newData[idx + 1] = minValue;
      newData[idx + 2] = minValue;
      newData[idx + 3] = data[idx + 3];
    }
  }
  
  // Дилатация (восстанавливает форму)
  const tempData = new Uint8ClampedArray(newData);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      let maxValue = 0;
      
      for (const [ky, kx] of kernel) {
        const ny = y + ky;
        const nx = x + kx;
        const nIdx = (ny * width + nx) * 4;
        maxValue = Math.max(maxValue, tempData[nIdx]);
      }
      
      newData[idx] = maxValue;
      newData[idx + 1] = maxValue;
      newData[idx + 2] = maxValue;
      newData[idx + 3] = tempData[idx + 3];
    }
  }
  
  return {
    data: newData,
    width: width,
    height: height
  };
};

// Функция гамма-коррекции
const applyGammaCorrection = (imageData, gamma) => {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return null;
  }
  
  const data = imageData.data;
  const length = data.length;
  
  // Создаем таблицу гамма-коррекции
  const gammaTable = new Array(256);
  for (let i = 0; i < 256; i++) {
    gammaTable[i] = Math.pow(i / 255, gamma) * 255;
  }
  
  for (let i = 0; i < length; i += 4) {
    data[i] = gammaTable[data[i]];         // R
    data[i + 1] = gammaTable[data[i + 1]]; // G
    data[i + 2] = gammaTable[data[i + 2]]; // B
  }
  
  return imageData;
};

// Функция показа красивого сообщения
const showMessageToUser = (text, type = 'info', duration = 5000) => {
  messageText.value = text;
  messageType.value = type;
  showMessage.value = true;
  
  setTimeout(() => {
    showMessage.value = false;
  }, duration);
};

// Функция скрытия сообщения
const hideMessage = () => {
  showMessage.value = false;
};

// Общая функция обработки результата QR-кода
const handleQRResult = (qrData) => {
  console.log("🔍 Получены данные от сканера:", qrData);
  
  if (scanResult.value === qrData) {
    console.log("⚠️ Дублирование QR-кода, пропускаем");
    return; // Избегаем дублирования
  }
  
  scanResult.value = qrData;
  console.log("✅ Найден новый QR-код:", scanResult.value);
  stopAutoScanning();
  
  if (isValidUrl(scanResult.value)) {
    console.log("🌐 QR-код содержит валидную ссылку");
    showMessageToUser(t('qr_found'), 'success', 2000);
    setTimeout(() => {
      walletStore.qrTake(scanResult.value);
    }, 500);
  } else {
    console.log("❌ QR-код не является ссылкой:", scanResult.value);
    showMessageToUser(t('not_a_link'), 'error', 3000);
    // Возобновляем сканирование если это не ссылка
    setTimeout(() => {
      scanResult.value = null;
      startAutoScanning();
    }, 5000);
  }
};

// Общая функция сканирования с тремя ключевыми библиотеками
const performScan = async () => {
  if (!videoElement.value || videoElement.value.readyState !== 4) return;

  try {    
    // Используем кешированный canvas
    if (!cachedCanvas) {
      cachedCanvas = document.createElement("canvas");
      cachedCtx = cachedCanvas.getContext("2d", { willReadFrequently: true });
    }
    
    const canvas = cachedCanvas;
    const ctx = cachedCtx;
    
    // Оптимальное разрешение для качества и производительности
    const video = videoElement.value;
    const scale = Math.min(1280 / video.videoWidth, 1280 / video.videoHeight, 2);
    
    const newWidth = Math.round(video.videoWidth * scale);
    const newHeight = Math.round(video.videoHeight * scale);
    
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
    }
    
    // Высокое качество отрисовки
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Правильная последовательность как в рабочем примере
    
    // Попытка 1: Html5Qrcode (основная библиотека)
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
      const file = new File([blob], 'scan.png', { type: 'image/png' });
      const result = await Html5Qrcode.scanFile(file, true);
      if (result && isValidUrl(result)) {
        handleQRResult(result);
        return;
      }
    } catch (e) {
      // Html5Qrcode не смог найти QR, переходим к jsQR
    }
    
    // Попытка 2: jsQR как fallback (как в примере)
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
        locateRegions: true,
        tryHarder: true
      });
      if (result?.data && isValidUrl(result.data)) {
        handleQRResult(result.data);
        return;
      }
    } catch (e) {
      // jsQR тоже не смог найти QR
    }
    
    // Попытка 3: ZXing как последний вариант для сложных случаев
    try {
      if (zxingReader) {
        const result = await zxingReader.decodeFromCanvas(canvas);
        if (result?.getText() && isValidUrl(result.getText())) {
          handleQRResult(result.getText());
          return;
        }
      }
    } catch (e) {
      // ZXing тоже не смог найти QR
    }
    
  } catch (error) {
    console.error("Ошибка сканирования:", error);
  }
};

const manualScan = async () => {
  // Показываем сообщение с достаточным временем для чтения
  showMessageToUser(t('scanning'), 'info', 2000);
  
  // Небольшая задержка, чтобы пользователь успел прочитать сообщение
  setTimeout(async () => {
    try {    
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      
      if (!videoElement.value || videoElement.value.readyState !== 4) {
        showMessageToUser(t('camera_not_ready'), 'error', 4000);
        return;
      }
      
      // Оптимальное разрешение как в рабочем примере
      const video = videoElement.value;
      const scale = Math.min(1920 / video.videoWidth, 1920 / video.videoHeight, 3);
      
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      // Максимальное качество отрисовки
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Создаем файл как в рабочем примере
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
      const file = new File([blob], 'manual-scan.png', { type: 'image/png' });
      
      // Основная функция сканирования как в примере
      const scanWithFallback = async (file, canvas) => {
        // Попытка 1: Html5Qrcode (основная библиотека как в примере)
        try {
          const result = await Html5Qrcode.scanFile(file, true);
          if (result) return result;
        } catch (e) {
          console.log('Html5Qrcode failed, trying jsQR...');
        }
        
        // Попытка 2: jsQR как fallback (точно как в примере)
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
            locateRegions: true,
            tryHarder: true
          });
          if (result?.data) return result.data;
        } catch (e) {
          console.log('jsQR failed, trying ZXing...');
        }
        
        // Попытка 3: ZXing для особо сложных случаев
        try {
          if (zxingReader) {
            const result = await zxingReader.decodeFromCanvas(canvas);
            if (result?.getText()) return result.getText();
          }
        } catch (e) {
          console.log('ZXing failed');
        }
        
        return null;
      };
      
      // Выполняем сканирование
      const result = await scanWithFallback(file, canvas);
      
      if (result && isValidUrl(result)) {
        handleQRResult(result);
      } else {
        // Если основные методы не сработали, пробуем с обработкой изображения
        console.log('Trying with image processing...');
        
        // Обработка изображения для улучшения читаемости
        const processedAttempts = [
          // CLAHE enhancement
          () => {
            try {
              const baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const processed = claheEnhancement(cloneImageData(baseImageData));
              if (!processed) return null;
              
              const result = jsQR(processed.data, processed.width, processed.height, {
                inversionAttempts: "attemptBoth",
                locateRegions: true,
                tryHarder: true
              });
              return result?.data;
            } catch (e) {
              return null;
            }
          },
          
          // Grayscale + CLAHE + Sharpen
          () => {
            try {
              const baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              let processed = convertToGrayscale(cloneImageData(baseImageData));
              if (!processed) return null;
              
              processed = claheEnhancement(processed);
              if (!processed) return null;
              
              processed = sharpenImage(processed);
              if (!processed) return null;
              
              const result = jsQR(processed.data, processed.width, processed.height, {
                inversionAttempts: "attemptBoth",
                locateRegions: true,
                tryHarder: true
              });
              return result?.data;
            } catch (e) {
              return null;
            }
          }
        ];
        
        // Пробуем обработанные варианты
        for (const attempt of processedAttempts) {
          const processedResult = attempt();
          if (processedResult && isValidUrl(processedResult)) {
            handleQRResult(processedResult);
            return;
          }
        }
        
        // Если ничего не найдено
        showMessageToUser(t('qr_not_found_manual'), 'error', 6000);
      }
      
    } catch (error) {
      console.error("Ошибка сканирования:", error);
      showMessageToUser(t('scan_error'), 'error', 4000);
    }
  }, 300);
};

// Функция для проверки, является ли строка URL
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const scanFromImage = async () => {
  if (!selectedImage.value) return;

  const img = new Image();
  
  img.onload = async function () {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      
      // Оптимальное разрешение для наилучшего качества
      const scale = Math.min(2048 / img.width, 2048 / img.height, 3);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Настройки максимального качества отрисовки
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Создаем файл как в рабочем примере
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
      const file = new File([blob], 'image-scan.png', { type: 'image/png' });
      
      // Основная функция сканирования (точно как в рабочем примере)
      const scanImageWithFallback = async (file, canvas) => {
        // Попытка 1: Html5Qrcode (основная библиотека)
        try {
          const result = await Html5Qrcode.scanFile(file, true);
          if (result) return result;
        } catch (e) {
          console.log('Html5Qrcode failed for image, trying jsQR...');
        }
        
        // Попытка 2: jsQR как fallback
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
            locateRegions: true,
            tryHarder: true
          });
          if (result?.data) return result.data;
        } catch (e) {
          console.log('jsQR failed for image, trying ZXing...');
        }
        
        // Попытка 3: ZXing для особо сложных случаев
        try {
          if (zxingReader) {
            const result = await zxingReader.decodeFromCanvas(canvas);
            if (result?.getText()) return result.getText();
          }
        } catch (e) {
          console.log('ZXing failed for image');
        }
        
        return null;
      };
      
      // Выполняем основное сканирование
      const result = await scanImageWithFallback(file, canvas);
      
      if (result && isValidUrl(result)) {
        console.log("Найден QR-код в изображении:", result);
        scanResult.value = result;
        stopAutoScanning();
        showMessageToUser(t('qr_found'), 'success', 2000);
        setTimeout(() => {
          walletStore.qrTake(scanResult.value);
        }, 500);
        return;
      }
      
      // Если основные методы не сработали, пробуем с улучшенной обработкой
      console.log('Trying advanced image processing...');
      
      const baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Расширенная обработка изображения (только самые эффективные методы)
      const advancedAttempts = [
        // CLAHE enhancement
        () => {
          try {
            const processed = claheEnhancement(cloneImageData(baseImageData));
            if (!processed) return null;
            
            const result = jsQR(processed.data, processed.width, processed.height, {
              inversionAttempts: "attemptBoth",
              locateRegions: true,
              tryHarder: true
            });
            return result?.data;
          } catch (e) {
            return null;
          }
        },
        
        // Grayscale + CLAHE + Sharpen
        () => {
          try {
            let processed = convertToGrayscale(cloneImageData(baseImageData));
            if (!processed) return null;
            
            processed = claheEnhancement(processed);
            if (!processed) return null;
            
            processed = sharpenImage(processed);
            if (!processed) return null;
            
            const result = jsQR(processed.data, processed.width, processed.height, {
              inversionAttempts: "attemptBoth",
              locateRegions: true,
              tryHarder: true
            });
            return result?.data;
          } catch (e) {
            return null;
          }
        },
        
        // Perspective correction + processing
        () => {
          try {
            let corrected = correctPerspective(cloneImageData(baseImageData));
            if (!corrected) return null;
            
            corrected = claheEnhancement(corrected);
            if (!corrected) return null;
            
            const result = jsQR(corrected.data, corrected.width, corrected.height, {
              inversionAttempts: "attemptBoth",
              locateRegions: true,
              tryHarder: true
            });
            return result?.data;
          } catch (e) {
            return null;
          }
        }
      ];
      
      // Пробуем расширенную обработку
      for (const attempt of advancedAttempts) {
        const processedResult = attempt();
        if (processedResult && isValidUrl(processedResult)) {
          console.log("Найден QR-код после обработки изображения:", processedResult);
          scanResult.value = processedResult;
          stopAutoScanning();
          showMessageToUser(t('qr_found'), 'success', 2000);
          setTimeout(() => {
            walletStore.qrTake(scanResult.value);
          }, 500);
          return;
        }
      }
      
      // Если ничего не найдено
      showMessageToUser(t('qr_not_in_image'), 'error', 4000);
      
    } catch (error) {
      console.error("Ошибка обработки изображения:", error);
      showMessageToUser(t('image_process_error'), 'error', 4000);
    }
  };

  img.onerror = function () {
    showMessageToUser(t('image_load_error'), 'error', 4000);
  };

  img.src = selectedImage.value;
};

const stopScanner = () => {
  try {
    stopAutoScanning(); // Останавливаем автоматическое сканирование
    
    if (zxingReader) {
      try {
        // ZXing не имеет reset(), просто обнуляем
        zxingReader = null;
      } catch (e) {
        console.warn('Ошибка при очистке ZXing reader:', e);
      }
    }
    
    if (stream) {
      try {
        stream.getTracks().forEach((track) => {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        });
        stream = null;
      } catch (e) {
        console.warn('Ошибка при остановке потока:', e);
      }
    }
    
    // Очищаем кешированные объекты
    if (cachedCanvas) {
      cachedCanvas = null;
      cachedCtx = null;
    }
  } catch (error) {
    console.error('Ошибка в stopScanner:', error);
  }
};

const toggleTorch = async () => {
  if (!stream) return;

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack || !("applyConstraints" in videoTrack)) {
    console.warn("Фонарик не поддерживается");
    return;
  }

  isTorchOn.value = !isTorchOn.value;
  await videoTrack.applyConstraints({
    advanced: [{ torch: isTorchOn.value }],
  });
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Останавливаем автоматическое сканирование при выборе файла
  stopAutoScanning();

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage.value = e.target.result;
  };
  reader.readAsDataURL(file);
};

const clearImage = () => {
  selectedImage.value = null;
  // Возобновляем автоматическое сканирование при закрытии превью
  startAutoScanning();
};

const goBack = () => {
  try {
    // Останавливаем все процессы сканирования
    stopScanner();
    
    // Очищаем состояние
    scanResult.value = null;
    selectedImage.value = null;
    showMessage.value = false;
    
    // Небольшая задержка перед навигацией для завершения очистки
    setTimeout(() => {
      router.push({ name: 'main' });
    }, 100);
  } catch (error) {
    console.error('Ошибка при закрытии сканера:', error);
    // В любом случае пытаемся вернуться назад
    router.go(-1);
  }
};
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
  z-index: 2150; /* Выше message-overlay */
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

/* Стили для красивого сообщения */
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
  pointer-events: none; /* Позволяет кликать сквозь overlay */
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
  pointer-events: auto; /* Позволяет взаимодействие с сообщением */
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

@keyframes pulseScan {
  0%, 100% {
    transform: scale(1);
    box-shadow: 
      0 32px 64px -12px rgba(0, 0, 0, 0.15),
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04),
      0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 
      0 36px 72px -12px rgba(59, 130, 246, 0.2),
      0 24px 30px -5px rgba(59, 130, 246, 0.15),
      0 12px 15px -5px rgba(59, 130, 246, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.1);
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

/* Адаптивность для мобильных */
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