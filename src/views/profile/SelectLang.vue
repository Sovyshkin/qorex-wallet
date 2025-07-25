<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useWalletStore } from '../../stores/walletStore.ts'

const { t } = useI18n();
const walletStore = useWalletStore()

</script>
<template>
  <header class="header">
    <img class="arrow" src="../../assets/arrow-left.png" alt="" @click="walletStore.goBack()" />
    <h1>{{ t("select_lang") }}</h1>
    <div class="emp"></div>
  </header>
  <main class="lang-list">
    <div class="list-item" v-for="(lang, i) in walletStore.langs" :key="i" @click="walletStore.changeLang(lang.value)">
      <span class="list-value">{{ lang.name }}</span>
      <img
        v-if="lang.active"
        class="check"
        src="../../assets/check.png"
        alt=""
      />
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

.arrow{ 
    height: 18px;
}

h1 {
    font-size: 18px;
    font-weight: 600;
}
.lang-list {
    width: 70%;
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
}

.list-value {
    font-size: 16px;
    font-weight: 500;
}

.check {
    height: 18px;
}
</style>
