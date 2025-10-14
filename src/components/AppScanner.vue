<template>
  <div class="wrap-load" v-if="walletStore.loaderScan || true">
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
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import jsQR from "jsqr";
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
let stream = null;
let scanningInterval = null;

// Автоматический запуск камеры при монтировании
onMounted(async () => {
  try {
    walletStore.loaderScan = false;
    
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
  stopScanner();
});

// Функция автоматического сканирования
const startAutoScanning = () => {
  scanningInterval = setInterval(() => {
    performScan();
  }, 100); // Увеличиваем частоту до 10 раз в секунду для быстрого отклика
};

// Функция остановки автоматического сканирования
const stopAutoScanning = () => {
  if (scanningInterval) {
    clearInterval(scanningInterval);
    scanningInterval = null;
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

// Общая функция сканирования с улучшенной обработкой
const performScan = () => {
  if (!videoElement.value || videoElement.value.readyState !== 4) return;

  try {    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    // Устанавливаем высокое разрешение для лучшего качества
    const video = videoElement.value;
    const scale = Math.min(1200 / video.videoWidth, 1200 / video.videoHeight, 2);
    
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    // Улучшаем качество отрисовки
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Получаем данные изображения
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Множественные попытки сканирования с разными настройками
    const scanAttempts = [
      // Попытка 1: обычное сканирование
      () => {
        try {
          return jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
        } catch (e) {
          console.warn("Ошибка в попытке 1:", e);
          return null;
        }
      },
      
      // Попытка 2: с инверсией
      () => {
        try {
          return jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "onlyInvert",
          });
        } catch (e) {
          console.warn("Ошибка в попытке 2:", e);
          return null;
        }
      },
      
      // Попытка 3: попробовать оба варианта
      () => {
        try {
          return jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
        } catch (e) {
          console.warn("Ошибка в попытке 3:", e);
          return null;
        }
      },
      
      // Попытка 4: улучшенный контраст
      () => {
        try {
          const enhanced = enhanceContrast(cloneImageData(imageData));
          if (!enhanced || !enhanced.data || !enhanced.width || !enhanced.height) {
            return null;
          }
          return jsQR(enhanced.data, enhanced.width, enhanced.height, {
            inversionAttempts: "attemptBoth",
          });
        } catch (e) {
          console.warn("Ошибка в попытке 4:", e);
          return null;
        }
      },
      
      // Попытка 5: бинаризация
      () => {
        try {
          const binary = binarizeImage(cloneImageData(imageData));
          if (!binary || !binary.data || !binary.width || !binary.height) {
            return null;
          }
          return jsQR(binary.data, binary.width, binary.height, {
            inversionAttempts: "attemptBoth",
          });
        } catch (e) {
          console.warn("Ошибка в попытке 5:", e);
          return null;
        }
      },
      
      // Попытка 6: с размытием для шумных изображений
      () => {
        try {
          const blurred = applyGaussianBlur(cloneImageData(imageData));
          if (!blurred || !blurred.data || !blurred.width || !blurred.height) {
            return null;
          }
          return jsQR(blurred.data, blurred.width, blurred.height, {
            inversionAttempts: "attemptBoth",
          });
        } catch (e) {
          console.warn("Ошибка в попытке 6:", e);
          return null;
        }
      }
    ];
    
    // Выполняем попытки последовательно
    for (const attempt of scanAttempts) {
      const code = attempt();
      if (code) {
        scanResult.value = code.data;
        console.log("Найден QR-код:", scanResult.value);
        stopAutoScanning();
        
        if (isValidUrl(scanResult.value)) {
          walletStore.qrTake(scanResult.value);
          return;
        } else {
          alert(t('not_a_link'));
          startAutoScanning();
          return;
        }
      }
    }
    
  } catch (error) {
    console.error("Ошибка сканирования:", error);
  }
};

const manualScan = async () => {
  // Теперь кнопка просто вызывает общую функцию сканирования
  performScan();
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

const scanFromImage = () => {
  if (!selectedImage.value) return;

  const img = new Image();
  
  img.onload = function () {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      // Увеличиваем разрешение для лучшего качества
      const scale = Math.min(1500 / img.width, 1500 / img.height, 3);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Настройки качества отрисовки
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Множественные попытки сканирования как в видеопотоке
      const scanAttempts = [
        // Попытка 1: обычное сканирование
        () => {
          try {
            return jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
          } catch (e) {
            console.warn("Ошибка в попытке 1:", e);
            return null;
          }
        },
        
        // Попытка 2: с инверсией
        () => {
          try {
            return jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "onlyInvert",
            });
          } catch (e) {
            console.warn("Ошибка в попытке 2:", e);
            return null;
          }
        },
        
        // Попытка 3: попробовать оба варианта
        () => {
          try {
            return jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });
          } catch (e) {
            console.warn("Ошибка в попытке 3:", e);
            return null;
          }
        },
        
        // Попытка 4: улучшенный контраст
        () => {
          try {
            const enhanced = enhanceContrast(cloneImageData(imageData));
            if (!enhanced || !enhanced.data || !enhanced.width || !enhanced.height) {
              return null;
            }
            return jsQR(enhanced.data, enhanced.width, enhanced.height, {
              inversionAttempts: "attemptBoth",
            });
          } catch (e) {
            console.warn("Ошибка в попытке 4:", e);
            return null;
          }
        },
        
        // Попытка 5: бинаризация
        () => {
          try {
            const binary = binarizeImage(cloneImageData(imageData));
            if (!binary || !binary.data || !binary.width || !binary.height) {
              return null;
            }
            return jsQR(binary.data, binary.width, binary.height, {
              inversionAttempts: "attemptBoth",
            });
          } catch (e) {
            console.warn("Ошибка в попытке 5:", e);
            return null;
          }
        },
        
        // Попытка 6: размытие
        () => {
          try {
            const blurred = applyGaussianBlur(cloneImageData(imageData));
            if (!blurred || !blurred.data || !blurred.width || !blurred.height) {
              return null;
            }
            return jsQR(blurred.data, blurred.width, blurred.height, {
              inversionAttempts: "attemptBoth",
            });
          } catch (e) {
            console.warn("Ошибка в попытке 6:", e);
            return null;
          }
        }
      ];
      
      // Выполняем попытки последовательно
      for (const attempt of scanAttempts) {
        const code = attempt();
        if (code) {
          scanResult.value = code.data;
          console.log("Найден QR-код:", scanResult.value);
          stopAutoScanning();
          
          if (isValidUrl(scanResult.value)) {
            walletStore.qrTake(scanResult.value);
            return;
          } else {
            alert(t('qr_no_link'));
            startAutoScanning();
            return;
          }
        }
      }
      
      alert(t('qr_not_in_image'));
      
    } catch (error) {
      console.error("Ошибка обработки изображения:", error);
      alert(t('image_process_error'));
    }
  };

  img.onerror = function () {
    alert(t('image_load_error'));
  };

  img.src = selectedImage.value;
};

const stopScanner = () => {
  stopAutoScanning(); // Останавливаем автоматическое сканирование
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
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
  router.go(-1);
};
</script>

<style scoped>
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
  z-index: 1001;
  cursor: pointer;
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
</style>