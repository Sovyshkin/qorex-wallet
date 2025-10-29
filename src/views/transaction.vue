<script setup>
import { useI18n } from "vue-i18n";
import { useRouter, useRoute } from "vue-router";
import { ref, onMounted } from "vue";
import { useWalletStore } from "@/stores/walletStore";

const { t } = useI18n();
const router = useRouter();
const route = useRoute()
const showCopiedNotification = ref(false);
const walletStore = useWalletStore();

const goBack = () => {
  router.go(-1);
};

const copy = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showCopiedNotification.value = true;
    setTimeout(() => {
      showCopiedNotification.value = false;
    }, 2000);
  });
};

const formatDateTime = (dateInput) => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {

    return "Некорректная дата";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const getTransactionStatus = (boolSuccess) => {
  // Проверяем различные значения статуса
  switch (boolSuccess) {
    case "Error timer":
      return { text: t('error_timer'), class: 'error' };
    case "True":
    case 'success':
    case true:
      return { text: t('success'), class: 'success' };
    case "Error":
      return { text: t('transaction_error'), class: 'error' };
    case 'wait':
    case "wait_pay":
    case false:
      return { text: t('in_processing'), class: 'in_processing' };
    default:
      return { text: t('in_processing'), class: 'in_processing' };
  }
};

onMounted(() => {
  let { id, amount_usdt, amount_rub, datatime, type_trans, bool_suecess } = route.query
  if (id && amount_usdt && amount_rub && datatime && type_trans && bool_suecess) {
    walletStore.transaction.id = id
    walletStore.transaction.amount = walletStore.roundToHundredths(amount_usdt)
    walletStore.transaction.amountRub = walletStore.roundToHundredths(amount_rub)
    walletStore.transaction.datatime = datatime
    walletStore.transaction.type_trans = type_trans
    walletStore.transaction.bool_suecess = bool_suecess === 'True'
  }
})
</script>

<template>
  <div class="transaction-page">
    <header class="header">
      <img
        class="arrow"
        src="@/assets/arrow-left.svg"
        alt=""
        @click="goBack()"
      />
      <h1>{{ t(walletStore.transaction.type_trans) }}</h1>
      <div class="emp"></div>
    </header>

    <div class="transaction-content">
      <div class="transaction-header">
        <div class="wrap-img">
          <img
            :src="`/assets/type-${walletStore.transaction.type_trans}.svg`"
            alt="transaction-type"
          />
        </div>
        <div class="transaction-amounts">
          <span class="amount-usdt"
            >{{
              walletStore.transaction.type_trans === "buy"
                ? "-"
                : walletStore.transaction.type_trans === "output"
                ? "-"
                : "+"
            }}{{ walletStore.roundToHundredths(walletStore.transaction.amount) }} USDT</span
          >
          <span class="amount-rub"
            >{{
              walletStore.transaction.type_trans === "buy"
                ? "-"
                : walletStore.transaction.type_trans === "output"
                ? "-"
                : "+"
            }}{{ walletStore.roundToHundredths(walletStore.transaction.amountRub) }} ₽</span
          >
        </div>
      </div>

      <!-- <div class="status-badge" :class="walletStore.transaction.status">
        {{ t(walletStore.transaction.status) }}
      </div> -->
      <span 
        :class="`status-badge ${getTransactionStatus(walletStore.transaction.bool_suecess).class}`"
      >
        {{ getTransactionStatus(walletStore.transaction.bool_suecess).text }}
      </span>

      <div class="transaction-details">
        <div class="detail-item">
          <span class="detail-label">{{ t("date_time") }}:</span>
          <span class="detail-value">{{
            formatDateTime(walletStore.transaction.datatime)
          }}</span>
        </div>

        <div class="detail-item" v-if="walletStore.transaction.type_trans == 'input'">
          <span class="detail-label">{{ t("transaction_id") }}:</span>
          <span
            @click="copy(walletStore.transaction.working_invoce)"
            class="detail-value"
            >{{ walletStore.transaction.working_invoce }} <img
            src="@/assets/copy.svg" alt="copy"</span
          >
        </div>
        <div class="detail-item" v-else>
          <span class="detail-label">{{ t("transaction_id") }}:</span>
          <span
            @click="copy(walletStore.transaction.id)"
            class="detail-value"
            >{{ walletStore.transaction.id }} <img
            src="@/assets/copy.svg" alt="copy"</span
          >
        </div>

        <div class="detail-item">
          <span class="detail-label">{{ t("currency_pair") }}:</span>
          <span class="detail-value">
            USDT /
            RUB
          </span>
        </div>

        <div class="detail-item">
          <span class="detail-label">{{ t("seller") }}:</span>
          <span class="detail-value">Garda Wallet</span>
        </div>

        <!-- <div class="detail-item">
          <span class="detail-label">{{ t("mcc_code") }}:</span>
          <span
            @click="copy(walletStore.transaction.mccCode)"
            class="detail-value"
            >{{ walletStore.transaction.mccCode }}
            <img src="@/assets/copy.svg" alt="copy"
          /></span>
        </div> -->
      </div>
      <transition name="fade">
        <div v-if="showCopiedNotification" class="copied-notification">
          {{ t("copied") }}
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.transaction-page {
  width: 100%;
  height: 100vh;
  color: #141414;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 20px 15px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

h1 {
  color: #141414;
}

.emp {
  width: 32px;
}

.arrow {
  cursor: pointer;
}

.transaction-content {
  flex: 1;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.transaction-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.transaction-header h2 {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.transaction-amounts {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.amount-usdt {
  font-size: 24px;
  font-weight: 400;
  text-align: center;
}

.amount-rub {
  font-size: 16px;
  opacity: 0.4;
  font-weight: 300;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 400;
}

.success {
  background-color: rgba(29%, 67%, 42%, 0.1);
  color: #4bab6b;
}

.error {
  background-color: rgba(84%, 16%, 16%, 0.1);
  color: #d62828;
}

.in_processing {
  background-color: rgba(213, 168, 16, 0.1);
  color: #d5a810;
}

.transaction-details {
  width: 100%;
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
}

.detail-label {
  opacity: 0.4;
  font-size: 12px;
  font-weight: 300;
}

.detail-value {
  font-size: 12px;
  font-weight: 400;
  text-align: right;
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
  height: 48px;
  width: 48px;
}

.copied-notification {
  position: fixed;
  bottom: 30px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 14px;
  z-index: 1000;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
