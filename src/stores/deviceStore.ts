import { defineStore } from 'pinia';
import { ref, computed, onMounted } from 'vue';

export const useDeviceStore = defineStore('device', () => {
  const currentDevice = ref({
    id: '',
    name: '',
    os: '',
    location: { country: '', city: '' },
    ip: '',
    status: 'Online',
    lastActive: new Date(),
    isCurrent: true
  });

  const sessions = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const tgWebApp = ref(null);

  // Инициализация Telegram WebApp
  const initTelegramWebApp = () => {
    if (window.Telegram?.WebApp) {
      tgWebApp.value = Telegram.WebApp;
      tgWebApp.value.expand();
      tgWebApp.value.enableClosingConfirmation();
      currentDevice.value.id = tgWebApp.value.initDataUnsafe.query_id || `web_${Date.now()}`;
    }
  };

  // Отправка данных через Telegram WebApp
  const sendTelegramData = (data) => {
    return new Promise((resolve, reject) => {
      if (!tgWebApp.value) {
        reject(new Error('Telegram WebApp not available'));
        return;
      }

      const eventHandler = (event) => {
        try {
          const response = JSON.parse(event);
          tgWebApp.value.offEvent('mainButtonClicked', eventHandler);
          resolve(response);
        } catch (e) {
          reject(e);
        }
      };

      tgWebApp.value.onEvent('mainButtonClicked', eventHandler);
      tgWebApp.value.sendData(JSON.stringify(data));
    });
  };

  // Получение информации об устройствах
  const fetchDevices = async () => {
    try {
      isLoading.value = true;
      const response = await sendTelegramData({
        type: 'get_devices',
        user_id: tgWebApp.value.initDataUnsafe.user?.id
      });
      
      sessions.value = response.devices.map(device => ({
        ...device,
        isCurrent: device.device_id === currentDevice.value.id
      }));
      
    } catch (err) {
      error.value = 'Ошибка загрузки устройств';
      console.error(err);
    } finally {
      isLoading.value = false;
    }
  };

  // Завершение сессии
  const terminateSession = async (deviceId) => {
    try {
      isLoading.value = true;
      await sendTelegramData({
        type: 'terminate_session',
        device_id: deviceId,
        user_id: tgWebApp.value.initDataUnsafe.user?.id
      });
      sessions.value = sessions.value.filter(s => s.device_id !== deviceId);
    } catch (err) {
      error.value = 'Ошибка завершения сессии';
      console.error(err);
    } finally {
      isLoading.value = false;
    }
  };

  // Определение текущего устройства
  const detectCurrentDevice = () => {
    const userAgent = navigator.userAgent;
    
    if (userAgent.match(/Macintosh/)) {
      currentDevice.value.name = 'Macintosh';
      currentDevice.value.os = userAgent.match(/Mac OS X (\d+_\d+)/) 
        ? `macOS ${userAgent.match(/Mac OS X (\d+_\d+)/)[1].replace('_', '.')}` 
        : 'macOS';
    }  else if (userAgent.match(/Windows/)) {
        currentDevice.value.name = 'Windows PC';
        currentDevice.value.os = 'Windows';
      } else if (userAgent.match(/Android/)) {
        currentDevice.value.name = 'Android Device';
        currentDevice.value.os = 'Android';
      } else if (userAgent.match(/iPhone|iPad|iPod/)) {
        currentDevice.value.name = 'Apple Device';
        currentDevice.value.os = 'iOS';
      } else {
        currentDevice.value.name = 'Unknown Device';
        currentDevice.value.os = 'Unknown OS';
      }
  };

  // Инициализация
  onMounted(() => {
    initTelegramWebApp();
    detectCurrentDevice();
    if (tgWebApp.value) fetchDevices();
  });

  return {
    currentDevice,
    sessions,
    isLoading,
    error,
    fetchDevices,
    terminateSession,
    otherSessions: computed(() => sessions.value.filter(s => !s.isCurrent))
  };
});