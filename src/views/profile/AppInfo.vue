<
<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useWalletStore } from "../../stores/walletStore.ts";
import { useRouter } from "vue-router";

const { t } = useI18n();
const walletStore = useWalletStore();
const router = useRouter();

const auth = ref([
  {
    name: 'AML',
    route: "aml"
  },
  {
    name: t('terms_of_use'),
    route: 'terms_of_use'
  },
  {
    name: t('privacy_policy'),
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
    <h1>{{ t("info") }}</h1>
    <div class="emp"></div>
  </header>
  <main class="safety">
    <h2>{{ t("documents") }}</h2>
    <div class="docs">
      <a class="list-item" v-for="(item, i) in auth" :key="i" :href="`https://gardawallet.com/documents/${item.route}`" target="_blank">
        <span class="list-value">{{ item.name }}</span>
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
</style>
