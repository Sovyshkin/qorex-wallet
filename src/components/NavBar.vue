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
        <img :src="`/assets/${item.icon}.png`" />
      </button>
      <button 
        @click="navigate" 
        :class="{ active: isActive }"
        @click.prevent="navigate"
        v-else
      >
        <img :src="`/assets/${item.icon}.png`" class="icon" />
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
  justify-content: space-around;
  align-items: center;
  padding: 12px 0;
  background: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  z-index: 100;
  border-top: 1px solid rgb(190, 188, 188);
}

button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 600;
  color: #888;
  cursor: pointer;
  transition: all 0.3s ease;
}

.scanner {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #007aff;
  padding: 10px;
  border-radius: 12px;
}

.scanner img {
  height: 35px;
}

button span {
  font-size: 14px;
  font-weight: 600;
}

button.active {
  color: var(--tg-theme-button-color, #007aff);
}

button .icon {
  width: 20px;
  height: 20px;
  stroke-width: 1.5;
}

/* Анимация при нажатии */
button:active {
  transform: scale(0.95);
}
</style>
