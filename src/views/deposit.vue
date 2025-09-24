<script setup>
import { useI18n } from "vue-i18n";
import { useWalletStore } from '@/stores/walletStore.ts'
import { ref } from "vue";

const { t } = useI18n();
const walletStore = useWalletStore();
const selectedNetwork = ref("USDT_TRC20");

const networks = [
  { id: "USDT_TRC20", name: "TRC20 (Tron)", icon: "usdt" },
  { id: "USDT_TON", name: "TON", icon: "ton" },
  { id: "USDT_ERC20", name: "ERC20 (Ethereum)", icon: "ethereum" }
];

const createInvoice = () => {
  walletStore.createInvoice(selectedNetwork.value);
};
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
    <div class="form-container">
      <div class="group">
        <input type="number" :placeholder="t('select_amount')" id="amount" v-model="walletStore.amount"/>
        <span class="group-item">USDT</span>
      </div>
      
      <div class="network-selector">
        <h3>Выберите сеть</h3>
        <div class="networks-list">
          <div 
            v-for="network in networks" 
            :key="network.id" 
            class="network-item" 
            :class="{ active: selectedNetwork === network.id }"
            @click="selectedNetwork = network.id"
          >
            <div class="network-icon">
              <img :src="`/assets/${network.icon}.png`" alt="">
            </div>
            <div class="network-info">
              <span class="network-name">{{ network.name }}</span>
            </div>
            <div class="network-check" v-if="selectedNetwork === network.id">
              <div class="check-icon"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <button class="btn" @click="createInvoice()">{{ t("continue") }}</button>
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

.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.network-selector {
  margin-top: 20px;
}

.network-selector h3 {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 400;
  color: #141414;
}

.networks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.network-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: #fff;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.network-item.active {
  background-color: #f5f5f5;
  border: 1px solid #deec51;
}

.network-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.icon-placeholder {
  width: 32px;
  height: 32px;
  background-color: #deec51;
  border-radius: 50%;
}

.network-info {
  flex: 1;
  margin-left: 10px;
}

.network-name {
  font-size: 14px;
  font-weight: 400;
  color: #141414;
}

.network-check {
  width: 24px;
  height: 24px;
}

.check-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #deec51;
  position: relative;
}

.check-icon:after {
  content: "";
  position: absolute;
  width: 12px;
  height: 6px;
  border-left: 2px solid #141414;
  border-bottom: 2px solid #141414;
  transform: rotate(-45deg);
  top: 8px;
  left: 6px;
}
</style>
