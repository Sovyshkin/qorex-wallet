<script setup>
import EmptyHistory from "@/components/EmptyHistory.vue";
import { useWalletStore } from "@/stores/walletStore";
import { useI18n } from "vue-i18n";
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

const walletStore = useWalletStore();
const { t } = useI18n();
const router = useRouter();

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
};

const groupedHistory = computed(() => {
  try {
    const groups = {};

    walletStore.history.forEach((item) => {
      const dateKey = formatDate(item.datatime);

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    return groups;
  } catch (err) {
    console.log(err);
  }
});

const getCurrencySymbol = (type) => {
  return type === "buy" ? "₽" : "USDT";
};

onMounted(async () => {
  await walletStore.getPrice();
  console.log(walletStore.history);
});
</script>

<template>
  <header class="header">
    <h1>{{ t("history_tranc") }}</h1>
  </header>
  {{ walletStore.history }}
  <div class="history">
    <template v-if="walletStore.history.length">
      <div
        v-for="(items, date) in groupedHistory"
        :key="date"
        class="history-group"
      >
        <h2 class="history-date">{{ date }}</h2>
        <div
          v-for="(item, index) in items"
          :key="index"
          class="history-item"
          @click="walletStore.goTransaction(item)"
        >
          <div class="history-info">
            <div class="wrap-img">
              <img
              v-if="item.type_trans"
                :src="`/assets/type-${item.type_trans}.svg`"
                alt="transaction-type"
              />
              <img
              v-else
                :src="`/assets/type-buy.svg`"
                alt="transaction-type"
              />
            </div>
            <div class="history-more-info">
              <span class="history-type" v-if="item.type_trans">{{ t(item.type_trans) }}</span>
               <span class="history-type" v-else>{{ t('buy') }}</span>
              <span v-if="item.bool_suecess" class="history-status success">{{
                t("success")
              }}</span>
              <span v-else class="history-status in_processing">{{
                t("in_processing")
              }}</span>
            </div>
          </div>
          <div class="history-count">
            <span class="count-usdt" v-if="!walletStore.hideBalanceActive">
              {{
                item.type_trans === "buy"
                  ? "-"
                  : item.type_trans === "output"
                  ? "-"
                  : "+"
              }}
              {{ item.amount }} USDT
            </span>
            <span class="count-usdt" v-else>********</span>
            <span class="count-rub" v-if="!walletStore.hideBalanceActive">
              {{
                item.type_trans === "buy"
                  ? "-"
                  : item.type_trans === "output"
                  ? "-"
                  : "+"
              }}
              {{ walletStore.getRub(item.amount) }} ₽
            </span>
            <span class="count-rub" v-else>********</span>
          </div>
        </div>
      </div>
    </template>

    <EmptyHistory v-else />
  </div>
</template>

<style scoped>
.header {
  padding: 20px 15px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

h1 {
  color: #141414;
}

.history {
  width: 100%;
  border-radius: 25px 25px 0 0;
  color: black;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.history-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.history-date {
  font-size: 16px;
  font-weight: 300;
  text-align: left;
  color: #141414;
}

.history-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  padding: 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 500ms ease;
}

.history-item:hover {
  transform: translateY(-3px);
  box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
}

.history-info {
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

.history-more-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.history-type {
  text-align: left;
  font-weight: 400;
}

.history-status {
  text-align: left;
  font-size: 10px;
  font-weight: 400;
}

.history-count {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.count-usdt {
  font-weight: 400;
  font-size: 14px;
  text-align: end;
}

.count-rub {
  opacity: 0.4;
  font-size: 10px;
  text-align: end;
  font-weight: 300;
}

.error {
  color: #d62828;
}

.success {
  color: #4bab6b;
}

.in_processing {
  color: #d5a810;
}
</style>
