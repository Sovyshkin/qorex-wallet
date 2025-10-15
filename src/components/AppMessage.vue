<script setup>
import { useI18n } from "vue-i18n";
import { useWalletStore } from "../stores/walletStore.ts";

const { t } = useI18n();
const walletStore = useWalletStore();

const clearMessage = () => {
  try {
    walletStore.message_status = "";
  } catch (err) {
    
  }
};
</script>
<template>
  <!-- Success Alert -->
  <div
    role="alert"
    @click="clearMessage()"
    class="alert success"
    v-if="walletStore.message_status == 'success'"
  >
    <svg
      stroke="currentColor"
      viewBox="0 0 24 24"
      fill="none"
      class="icon"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      ></path>
    </svg>
    <p class="text-xs font-semibold">Success - Everything went smoothly!</p>
  </div>

  <!-- Info Alert -->
  <div
    @click="clearMessage()"
    role="alert"
    class="alert info"
    v-if="walletStore.message_status == 'info'"
  >
    <svg
      stroke="currentColor"
      viewBox="0 0 24 24"
      fill="none"
      class="icon"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      ></path>
    </svg>
    <p class="text-xs font-semibold">
      Info - This is some information for you.
    </p>
  </div>

  <!-- Warning Alert -->
  <div
    @click="clearMessage()"
    role="alert"
    class="alert warning"
    v-if="walletStore.message_status == 'warning'"
  >
    <svg
      stroke="currentColor"
      viewBox="0 0 24 24"
      fill="none"
      class="icon"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      ></path>
    </svg>
    <p class="text-xs font-semibold">
      Warning - Be careful with this next step.
    </p>
  </div>

  <!-- Error Alert -->
  <div
    @click="clearMessage()"
    role="alert"
    class="alert error"
    v-if="walletStore.message_status == 'error'"
  >
    <svg
      stroke="currentColor"
      viewBox="0 0 24 24"
      fill="none"
      class="icon"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 16h-1v-4h1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      ></path>
    </svg>
    <p class="text-xs font-semibold">Error - Something went wrong.</p>
  </div>
</template>

<style scoped>
.alert {
  position: absolute;
  top: 2%;
  left: 50%;
  width: 100%;
  max-width: 300px;
  transform: translateX(-50%);
  border-left-width: 4px;
  padding: 0.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  transition-property: background-color, transform;
  transition-timing-function: ease-in-out;
  transition-duration: 300ms;
  z-index: 1000;
}

.alert:hover {
  transform: scale(1.05);
}

.icon {
  height: 1.25rem;
  width: 1.25rem;
  flex-shrink: 0;
  margin-right: 0.5rem;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.font-semibold {
  font-weight: 600;
}

/* Success */
.success {
  background-color: #f0fdf4;
  border-color: #22c55e;
  color: #14532d;
}
.dark .success {
  background-color: #052e16;
  border-color: #15803d;
  color: #f0fdf4;
}
.success .icon {
  color: #16a34a;
}
.success:hover {
  background-color: #dcfce7;
}
.dark .success:hover {
  background-color: #166534;
}

/* Info */
.info {
  background-color: #f0f9ff;
  border-color: #3b82f6;
  color: #1e40af;
}
.dark .info {
  background-color: #172554;
  border-color: #1d4ed8;
  color: #f0f9ff;
}
.info .icon {
  color: #2563eb;
}
.info:hover {
  background-color: #e0f2fe;
}
.dark .info:hover {
  background-color: #1e40af;
}

/* Warning */
.warning {
  background-color: #fefce8;
  border-color: #f59e0b;
  color: #854d0e;
}
.dark .warning {
  background-color: #422006;
  border-color: #b45309;
  color: #fefce8;
}
.warning .icon {
  color: #d97706;
}
.warning:hover {
  background-color: #fef08a;
}
.dark .warning:hover {
  background-color: #713f12;
}

/* Error */
.error {
  background-color: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
}
.dark .error {
  background-color: #450a0a;
  border-color: #b91c1c;
  color: #fee2e2;
}
.error .icon {
  color: #dc2626;
}
.error:hover {
  background-color: #fecaca;
}
.dark .error:hover {
  background-color: #7f1d1d;
}
</style>
