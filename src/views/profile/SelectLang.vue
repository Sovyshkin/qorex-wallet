<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useWalletStore } from '../../stores/walletStore.ts'

const { t } = useI18n();
const walletStore = useWalletStore()

</script>
<template>
  <header class="header">
    <img class="arrow" src="../../assets/arrow-left.svg" alt="" @click="walletStore.goBack()" />
    <h1>{{ t("select_lang") }}</h1>
    <div class="emp"></div>
  </header>
  <main class="lang-list">
    <div class="list-item" v-for="(lang, i) in walletStore.langs" :key="i" @click="walletStore.changeLang(lang.value)">
      <span class="list-value">{{ lang.name }}</span>
      <img
        v-if="lang.active"
        class="check"
        src="../../assets/check.svg"
        alt=""
      />
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

.arrow{ 
    height: 32px;
}

h1 {
  color: #141414;
}

.emp {
  width: 32px;
}
.lang-list {
  padding: 0 15px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin: 0 auto;
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

.check {
    height: 24px;
    width: 24px;
}
</style>
