<script setup>
import { useI18n } from "vue-i18n";
import { useWalletStore } from '@/stores/walletStore.ts'

const { t } = useI18n();
const walletStore = useWalletStore()

</script>
<template>
  <header class="header">
    <img
      class="arrow"
      src="../assets/arrow-left.svg"
      alt=""
      @click="walletStore.goBack()"
    />
    <h1>{{ t("deposit_page") }}</h1>
    <div class="emp"></div>
  </header>
  <main class="container">
    <div class="group">
        <input type="number" :placeholder="t('select_amount')" id="amount" v-model="walletStore.amount"/>
        <span class="group-item">USDT</span>
    </div>
    <button class="btn" @click="walletStore.createInvoice()">{{ t("continue") }}</button>
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

.emp {
  width: 32px;
}

h1 {
  color: #141414;
}

.container {
  height: 72vh;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  padding: 0 20px;
}

.btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 8px;
  font-weight: 300;
  font-size: 14px;
  color: #141414;
  background-color: #deec51;
}

input,
textarea,
select {
  width: 100%;
  border: 1px solid black;
  border-radius: 10px;
  padding: 16px;
  background: none;
  outline: none;
}

input::placeholder,
textarea::placeholder,
select::placeholder {
  color: #a5a5a5;
  font-weight: 400;
  font-size: 14px;
  line-height: 19.12px;
}

.group {
    position: relative;
}

.group-item {
    position: absolute;
    right: 4%;
    top: 50%;
    transform: translateY(-50%);
}
</style>
