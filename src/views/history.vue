<script setup>
import EmptyHistory from '@/components/EmptyHistory.vue'
import { useWalletStore } from "@/stores/walletStore";
import { useI18n } from "vue-i18n";

const walletStore = useWalletStore();
const { t } = useI18n();
</script>
<template>
  <div class="history">
      <h1>{{ t('history_tranc') }}</h1>
        <div class="history-item">
          <div class="history-info">
            <img
              src=""
              alt=""
            />
            <div class="history-more-info">
                <span class="history-type">USDT</span>
                <span class="history-place">100 ₽</span>
            </div>
          </div>
          <div class="history-count">
            <span class="count-rub" v-if="!walletStore.hideBalanceActive">-900 ₽</span>
            <span class="count-rub" v-else>********</span>
            <span class="count-usdt" v-if="!walletStore.hideBalanceActive">-9 USDT</span>
            <span class="count-usdt" v-else>********</span>
          </div>
        </div>
    </div>
    <EmptyHistory v-if="false"/>
</template>
<style scoped>
.history {
  height: 100vh;
  width: 100%;
  border-radius: 25px 25px 0 0;
  color: black;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.history-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  padding: 10px 15px;
  border-radius: 12px;
}

.history-info {
    display: flex;
    align-items: center;
    gap: 15px;
}

.history-info img {
  height: 40px;
  width: 40px;
}

.history-more-info, .history-count {
    display: flex;
    flex-direction: column;
}

.history-type, .history-place {
  text-align: left;
}

.history-type, .history-rub {
    font-weight: 500;
}

.history-place, .count-usdt {
    color: #9c9da4;
    font-size: 14px;
    letter-spacing: .15px;
    line-height: 18px;
}

.count-usdt {
  text-align: end;
}

.history-rub {
    text-align: end;
}</style>