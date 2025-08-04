<
<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useWalletStore } from "../../stores/walletStore.ts";
import { useRouter } from "vue-router";

const { t } = useI18n();
const walletStore = useWalletStore();
const router = useRouter();

const accounts = ref([
  {
    name: 'Telegram',
    value: '@Garda_wallet',
    icon: 'telegram',
    route: "aml"
  },
  {
    name: "Instagram",
    value: '@Garda_wallet',
    icon: 'instagram',
    route: 'terms_of_use'
  },
  {
    name: "VK",
    value: '@Garda_wallet',
    icon: 'vk',
    route: 'privacy_policy'
  },
]);
</script>

<template>
  <header class="header">
    <img
      class="arrow"
      src="../../assets/arrow-left.svg"
      alt=""
      @click="walletStore.goBack()"
    />
    <h1>{{ t("official_accounts") }}</h1>
    <div class="emp"></div>
  </header>
  <main class="safety">
    <div class="docs">
      <a class="list-item" v-for="(item, i) in accounts" :key="i" :href="`#`">
        <div class="info">
            <div class="wrap-img">
            <img :src="`/assets/${item.icon}.svg`" :alt="item.icon" />
          </div>
          <div class="wrap-text">
              <span class="list-value">{{ item.name }}</span>
              <span class="subtitle">{{ item.value }}</span>
          </div>
        </div>
        <img class="arrow-right" src="../../assets/arrow-right.svg" alt="arrow-right" />
      </a>
    </div>
  </main>
</template>

<style scoped>
.header {
  padding: 20px 15px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

h2 {
  color: #141414;
  font-weight: 300;
}
.safety {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 15px;
}

.docs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.profile-value {
  color: #141414;
  font-weight: 300;
}

.list-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  transition: all 0.3s ease;
  padding: 16px;
  border-radius: 16px;
}

.list-value {
  font-size: 14px;
}

.info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wrap-img {
  background-color: #deec51;
  padding: 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wrap-img img {
  height: 24px;
  width: 24px;
}

.arrow {
  height: 32px;
  width: 32px;
  transition: transform 0.3s ease;
}

.arrow-right {
  width: 24px;
  height: 24px;
}

.list-item:hover .arrow {
  transform: translateX(5px);
  transition: transform 0.3s ease;
}
.emp {
  width: 32px;
}

.wrap-text {
    display: flex;
    flex-direction: column;
}

.subtitle {
    opacity: 0.4;
    font-weight: 300;
    font-size: 10px;
}
</style>
