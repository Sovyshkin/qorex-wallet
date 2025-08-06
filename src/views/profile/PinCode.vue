<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useWalletStore } from "../../stores/walletStore.ts";
import { useRouter, useRoute } from 'vue-router';

const { t } = useI18n();
const walletStore = useWalletStore();
const router = useRouter();
const route = useRoute()

const pin = ref("");
const pressedButton = ref(null);

// Определяем режим работы на основе наличия PIN-кода
const isCreateMode = route.query.createMode || false

const handleNumberClick = (num) => {
  if (pin.value.length < 4) {
    pin.value += num.toString();
  }

  if (pin.value.length === 4) {
    if (isCreateMode) {
      walletStore.setPinCode(pin.value);
      router.push({ name: 'safety' });
    } else {
      if (walletStore.verifyPin(pin.value)) {
        router.go(-1);
      } else {
        pin.value = "";
      }
    }
  }
};

const startPress = (num) => {
  pressedButton.value = num;
};

const endPress = () => {
  pressedButton.value = null;
};
</script>

<template>
  <header class="header">
    <img
      class="arrow"
      src="../../assets/arrow-left.png"
      alt=""
      v-if="isCreateMode"
      @click="walletStore.goBack()"
    />
    <div class="emp" v-else></div>
    <h1>{{ isCreateMode ? t('create_pincode') : t('enter_pincode') }}</h1>
    <div class="emp"></div>
  </header>
  <main class="pin-code-container">
    <div class="pin-dots">
      <div
        v-for="i in 4"
        :key="i"
        class="pin-dot"
        :class="{ active: pin.length >= i }"
      ></div>
    </div>

    <div class="pin-grid">
      <button
        v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]"
        :key="num"
        class="pin-button"
        @click="handleNumberClick(num)"
        @mousedown="startPress(num)"
        @mouseup="endPress()"
        @mouseleave="endPress()"
        :class="{ pressed: pressedButton === num }"
      >
        {{ num }}
      </button>
    </div>
</main>
</template>

<style scoped>
.header {
  padding: 20px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.arrow {
  height: 18px;
}

h1 {
  font-size: 18px;
  font-weight: 600;
}
.pin-code-container {
  max-width: 350px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
  font-family: Arial, sans-serif;
}

.pin-title {
  margin-bottom: 30px;
  color: #333;
}

.pin-dots {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #e0e0e0;
  transition: all 0.3s ease;
}

.pin-dot.active {
  background-color: #DEEC51;
  transform: scale(1.2);
}

.pin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.pin-button {
  width: 100%;
  height: 80px;
  border: none;
  border-radius: 30px;
  background-color: #fff;
  font-size: 24px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.pin-button:active,
.pin-button.pressed {
  background-color: #e0e0e0;
  transform: scale(0.95);
}

.pin-button::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%, -50%);
  transform-origin: 50% 50%;
}

.pin-button:active::after,
.pin-button.pressed::after {
  animation: ripple 0.6s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 1;
  }
  100% {
    transform: scale(20, 20);
    opacity: 0;
  }
}

.pin-button:nth-child(10) {
  grid-column: 2;
}
</style>
