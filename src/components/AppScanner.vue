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

      <!-- Контейнер для сканера Html5Qrcode -->
      <div id="qr-reader" ref="qrReader" class="scanner-container"></div>

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
        <button class="scan-button" @click="manualScan" :class="{ 'pulse-animation': !isScanning }">
          <div class="scan-button-circle">
            <span v-if="!isScanning" class="camera-emoji">📷</span>
          </div>
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
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { useI18n } from 'vue-i18n';
import { useWalletStore } from "@/stores/walletStore";

export default {
  name: 'QrScannerFullscreen',
  setup() {
    const { t } = useI18n();
    const walletStore = useWalletStore();
    return { t, walletStore };
  },
  data() {
    return {
      scanner: null,
      html5QrCode: null,
      isScanning: false,
      lastResult: null,
      showMessage: false,
      messageText: '',
      messageType: 'info',
      isTorchOn: false,
      currentCameraId: null
    };
  },
  mounted() {
    console.log('AppScanner монтирован, инициализация сканера...');
    
    // Даем время для загрузки DOM, затем инициализируем сканер
    setTimeout(() => {
      this.initializeScanner();
    }, 500);
  },
  beforeUnmount() {
    this.stopScanner();
  },
  methods: {
    initializeScanner() {
      console.log('Инициализация Html5QrcodeScanner...');
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [],
        aspectRatio: 1.777778,
        showTorchButtonIfSupported: false,
        useBarCodeDetectorIfSupported: true
      };

      this.scanner = new Html5QrcodeScanner(
        "qr-reader",
        config,
        false
      );

      console.log('Html5QrcodeScanner создан, запуск...');
      
      // Автоматический запуск после инициализации с задержкой
      setTimeout(() => {
        this.startScanner();
      }, 1000);
    },

    async startScanner() {
      if (this.isScanning) return;

      try {
        console.log('Запуск Html5QrcodeScanner...');
        
        await this.scanner.render(
          (decodedText) => this.onScanSuccess(decodedText),
          (errorMessage) => this.onScanFailure(errorMessage)
        );
        
        this.isScanning = true;
        console.log('QR Scanner успешно запущен');
        
        // Проверяем что камера запустилась
        setTimeout(() => {
          const video = document.querySelector('#qr-reader video');
          if (video && video.srcObject) {
            console.log('Камера активна и отображается');
          } else {
            console.warn('Камера не запустилась, возможно нужно разрешение пользователя');
            this.showMessageToUser('Для работы сканера разрешите доступ к камере', 'info', 4000);
          }
        }, 2000);
        
        // Получаем cameraId для управления фонариком
        await this.getCurrentCameraId();
        
      } catch (error) {
        console.error('Ошибка запуска сканера:', error);
        this.isScanning = false;
        
        // Если ошибка связана с доступом к камере
        if (error.message && error.message.includes('Permission denied')) {
          this.showMessageToUser('Разрешите доступ к камере для сканирования QR кодов', 'error', 5000);
        } else if (error.message && error.message.includes('NotFoundError')) {
          this.showMessageToUser('Камера не найдена. Проверьте подключение камеры.', 'error', 5000);
        } else {
          this.showMessageToUser(this.t('camera_error'), 'error', 4000);
        }
      }
    },

    async getCurrentCameraId() {
      try {
        // Ждем немного чтобы сканер полностью инициализировался
        setTimeout(async () => {
          try {
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0) {
              // Берем первую камеру (обычно задняя)
              this.currentCameraId = cameras[0].id;
              console.log('Current camera:', this.currentCameraId);
            }
          } catch (error) {
            console.warn('Cannot get camera ID:', error);
          }
        }, 1000);
      } catch (error) {
        console.warn('Cannot access cameras:', error);
      }
    },

    async stopScanner() {
      if (this.scanner && this.isScanning) {
        try {
          await this.scanner.clear();
          this.isScanning = false;
          this.currentCameraId = null;
          console.log('QR Scanner stopped');
        } catch (error) {
          console.error("Failed to clear scanner:", error);
        }
      }
    },

    async toggleTorch() {
      if (!this.currentCameraId || !this.isScanning) {
        this.showMessageToUser(this.t('torch_not_supported'), 'error', 3000);
        return;
      }

      try {
        this.isTorchOn = !this.isTorchOn;
        
        // Получаем видео элемент для управления фонариком
        const videoElement = document.querySelector('#qr-reader video');
        if (videoElement && videoElement.srcObject) {
          const videoTrack = videoElement.srcObject.getVideoTracks()[0];
          if (videoTrack && videoTrack.getCapabilities().torch) {
            await videoTrack.applyConstraints({
              advanced: [{ torch: this.isTorchOn }]
            });
            return;
          }
        }
        
        // Если не удалось через track, пробуем через constraints камеры
        this.showMessageToUser(this.t('torch_not_supported'), 'error', 3000);
        this.isTorchOn = !this.isTorchOn; // revert
        
      } catch (error) {
        console.error('Torch toggle failed:', error);
        this.isTorchOn = !this.isTorchOn; // revert on error
        this.showMessageToUser(this.t('torch_not_supported'), 'error', 3000);
      }
    },

    onScanSuccess(decodedText) {
      if (this.lastResult === decodedText) return;
      
      this.lastResult = decodedText;
      console.log('Scanned QR Code:', decodedText);
      
      this.showMessageToUser(this.t('qr_found'), 'success', 2000);
      
      // Передаем результат в store и закрываем сканер
      setTimeout(() => {
        this.walletStore.qrTake(this.lastResult);
        this.goBack();
      }, 500);
    },

    onScanFailure(error) {
      // Игнорируем обычные ошибки сканирования
      if (error !== 'QR code parse error, error = NotFoundException' && 
          !error.includes('NotFoundException')) {
        console.warn('QR Scan error:', error);
      }
    },

    manualScan() {
      if (!this.isScanning) {
        // Если сканер не активен, пробуем запустить его заново
        console.log('Попытка перезапуска сканера вручную...');
        this.showMessageToUser('Запуск сканера...', 'info', 2000);
        
        // Очищаем предыдущий сканер если он есть
        if (this.scanner) {
          this.stopScanner();
          setTimeout(() => {
            this.initializeScanner();
          }, 500);
        } else {
          this.initializeScanner();
        }
      } else {
        // Для ручного сканирования показываем сообщение
        this.showMessageToUser(this.t('scanning'), 'info', 2000);
      }
    },

    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        this.showMessageToUser('Пожалуйста, выберите изображение', 'error', 3000);
        return;
      }

      // Проверяем размер файла (максимум 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        this.showMessageToUser('Файл слишком большой. Максимальный размер: 10MB', 'error', 3000);
        return;
      }

      // Сразу сканируем файл после выбора
      this.scanFromImageFile(file);
      
      // Сбрасываем input
      event.target.value = '';
    },

    async scanFromImageFile(file) {
      this.showMessageToUser('Сканирование изображения...', 'info', 5000);
      
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
          this.onScanSuccess(result);
          
        } catch (scanError) {
          this.showMessageToUser('QR-код не найден в изображении', 'error', 4000);
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
        this.showMessageToUser('Ошибка сканирования изображения', 'error', 4000);
      }
    },

    showMessageToUser(text, type = 'info', duration = 5000) {
      this.messageText = text;
      this.messageType = type;
      this.showMessage = true;
      
      setTimeout(() => {
        this.showMessage = false;
      }, duration);
    },

    hideMessage() {
      this.showMessage = false;
    },

    goBack() {
      this.stopScanner();
      this.$router.push({ name: 'main' });
    }
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

.scanner-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* Стили для сканера - исправляем отображение видео */
:deep(#qr-reader) {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

:deep(#qr-reader__dashboard) {
  display: none !important;
}

:deep(#qr-reader__dashboard_section) {
  display: none !important;
}

:deep(#qr-reader__camera_selection) {
  display: none !important;
}

:deep(#html5-qrcode-button-camera-stop) {
  display: none !important;
}

:deep(#html5-qrcode-button-camera-start) {
  display: none !important;
}

:deep(#html5qr-code-full-region) {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
}

:deep(#reader__dashboard_section_swaplink) {
  display: none !important;
}

:deep(#reader__dashboard_section_csr) {
  display: none !important;
}

:deep(video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
}

:deep(canvas) {
  display: none !important;
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
  z-index: 2;
  pointer-events: none;
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
  pointer-events: auto;
}

.scan-button {
  border: 2px solid #fff;
  border-radius: 100%;
  cursor: pointer;
  padding: 5px;
  background: transparent;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  transition: all 0.3s ease;
}

.scan-button.pulse-animation {
  animation: pulseCamera 2s infinite;
}

@keyframes pulseCamera {
  0% {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(255, 255, 255, 0.7);
  }
  70% {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 10px rgba(255, 255, 255, 0);
  }
  100% {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

.scan-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scan-button-circle {
  border-radius: 100%;
  height: 60px;
  width: 60px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-emoji {
  font-size: 24px;
  line-height: 1;
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
  pointer-events: none;
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
  pointer-events: auto;
  transition: opacity 0.2s ease;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  pointer-events: auto;
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
  
  .scan-frame {
    width: 80%;
    height: 250px;
  }
}
</style>