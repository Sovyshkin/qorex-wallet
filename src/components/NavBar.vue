<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const activeTab = ref("main");

const navItems = [
  { id: "main", name: t("main"), icon: "main", path: "/" },
  { id: "history", name: t("history"), icon: "history", path: "/history" },
  { id: "scanner", name: t("scanner"), icon: "scanner", path: "/scanner" },
  { id: "browser", name: t("browser"), icon: "browser", path: "/browser" },
  { id: "profile", name: t("profile"), icon: "profile", path: "/profile" },
];

const setActiveTab = (tabId) => {
  activeTab.value = tabId;
};
</script>
<template>
  <nav class="navbar">
    <router-link
      v-for="item in navItems"
      :key="item.id"
      :to="item.path"
      custom
      v-slot="{ navigate, isActive }"
    >
      <button 
        @click="navigate" 
        :class="{ active: isActive }"
        class="scanner"
        @click.prevent="navigate"
        v-if="item.id == 'scanner'"
      >
        <img :src="`/assets/${item.icon}.svg`" />
      </button>
      <button 
        @click="navigate" 
        :class="{ active: isActive }"
        @click.prevent="navigate"
        v-else
      >
        <img :src="`/assets/${item.icon}.svg`" class="icon" />
        <span>{{ item.name }}</span>
      </button>
    </router-link>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  z-index: 100;
  border-radius: 8px 8px 0 0;
}

button {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 600;
  color: #888;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.6;
}

.scanner {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #DEEC51;
  padding: 8px;
  border-radius: 8px;
  opacity: 1;
}

.scanner img {
  height: 36px;
  width: 36px;
}

button span {
  padding: 0;
  font-size: 10px;
  font-weight: 300;
}

button.active {
  color: var(--tg-theme-button-color, #0373ff);
}

button .icon {
  width: 24px;
  height: 24px;
}

/* Анимация при нажатии */
button:active {
  transform: scale(0.95);
}

.active {
  opacity: 1;
}
</style>
