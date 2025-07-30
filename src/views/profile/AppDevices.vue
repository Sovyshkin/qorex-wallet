<script setup>
import { storeToRefs } from 'pinia';
import { useDeviceStore } from '@/stores/deviceStore';

const deviceStore = useDeviceStore();
const { currentDevice, otherSessions, error } = storeToRefs(deviceStore);
const { fetchDevices, terminateSession } = deviceStore;

const formatDate = (date) => {
  return new Date(date).toLocaleString();
};
</script>
<template>
  <div class="devices-view">
    <h1>Устройства</h1>
    <template>
      <section class="current-device">
        <h2>ТЕКУЩЕЕ</h2>
        <div class="device-card">
          <div class="device-info">
            <strong>{{ currentDevice.name }} — {{ currentDevice.os }}</strong>
            <div>{{ currentDevice.location.city }}, {{ currentDevice.location.country }}</div>
            <div class="status online">Online</div>
          </div>
        </div>
      </section>

      <section v-if="otherSessions.length > 0" class="other-devices">
        <h2>ДРУГИЕ УСТРОЙСТВА</h2>
        <div v-for="session in otherSessions" :key="session.device_id" class="session-card">
          <div class="session-info">
            <strong>{{ session.device_name }} — {{ session.os }}</strong>
            <div>{{ session.location.city }}, {{ session.location.country }}</div>
            <div :class="['status', { online: session.is_active }]">
              {{ session.is_active ? 'Online' : `Last active: ${formatDate(session.last_activity)}` }}
            </div>
          </div>
          <button 
            v-if="!session.isCurrent"
            @click="terminateSession(session.device_id)"
            class="terminate-btn"
            :disabled="isLoading"
          >
            Завершить
          </button>
        </div>
      </section>

      <div class="inactivity-notice">
        В случае отсутствия активности в течение 5 дней система автоматически завершит сессию.
      </div>
    </template>
  </div>
</template>

<style scoped>
.devices-view {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.device-card, .session-card {
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
}

.status {
  color: var(--tg-theme-hint-color);
  margin-top: 4px;
}

.status.online {
  color: var(--tg-theme-button-color);
}

.terminate-btn {
  background: var(--tg-theme-destructive-color);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  margin-top: 8px;
}

.inactivity-notice {
  font-size: 14px;
  color: var(--tg-theme-hint-color);
  margin-top: 16px;
  padding: 12px;
  background: var(--tg-theme-secondary-bg-color);
  border-radius: 8px;
}

.loading, .error {
  text-align: center;
  padding: 24px;
}
</style>