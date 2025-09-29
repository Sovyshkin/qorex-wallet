<template>
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
        {{ walletStore.responseTest }}
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


// Автоматический запуск камеры при монтировании
onMounted(async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        torch: true,
      },
    });
    videoElement.value.srcObject = stream;
    await videoElement.value.play();
  } catch (error) {
    console.error("Ошибка доступа к камере:", error);
  }
});

// Остановка при размонтировании
onBeforeUnmount(() => {
  stopScanner();
});

const manualScan = async () => {
  if (!videoElement.value) return;

  try {    
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.value.videoWidth;
    canvas.height = videoElement.value.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      scanResult.value = code.data;
      console.log("Найден QR-код:", scanResult.value);
      if (isValidUrl(scanResult.value)) {
        walletStore.qrTake(scanResult.value)
      } else {
        alert(t('not_a_link'));
      }
    } else {
      alert(t('qr_not_found'));
    }
  } catch (error) {
    console.error("Ошибка сканирования:", error);
    alert(t('scan_error'));
  }
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
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        scanResult.value = code.data;
        console.log("Найден QR-код:", scanResult.value);
        console.log(isValidUrl(scanResult.value));  
        // Проверяем, что это валидный URL
        if (isValidUrl(scanResult.value)) {
          walletStore.qrTake(scanResult.value)
        } else {
          alert(t('qr_no_link'));
        }
      } else {
        alert(t('qr_not_in_image'));
      }
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

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedImage.value = e.target.result;
  };
  reader.readAsDataURL(file);
};

const clearImage = () => {
  selectedImage.value = null;
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
  background: rgba(0, 0, 0, 0.7);
  background-color: none;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}
</style>
