<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useWalletStore } from "@/stores/walletStore";
import { useRouter } from "vue-router";

const { t } = useI18n();
const showCopiedNotification = ref(false);
const walletStore = useWalletStore();
const router = useRouter();

const copy = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showCopiedNotification.value = true;
    setTimeout(() => {
      showCopiedNotification.value = false;
    }, 2000);
  });
};

const goBack = () => {
  router.go(-1);
};

// Данные рефералов
const referals = ref([
  {
    name: "Sasha",
    regDate: "02/18/2025",
    amount: "170,12",
  },
  {
    name: "Voron",
    regDate: "02/18/2025",
    amount: "70,12",
  },
  {
    name: "Alex",
    regDate: "02/18/2025",
    amount: "10,12",
  },
]);

// Общая статистика
const stats = ref({
  totalreferals: 120,
  totalAmount: "12 870,12",
});
</script>

<template>
  <div class="referal-page">
    <header class="header">
      <img
        src="@/assets/arrow-left.svg"
        :alt="t('back')"
        class="back-arrow"
        @click="goBack()"
      />
      <h1>{{ t("referal") }}</h1>
      <div class="header-spacer"></div>
    </header>

    <div class="content">
      <div class="banner">
        <h2 v-html="t('earn_up_to_15')"></h2>
      </div>
      <div class="referal-section">
        <div class="referal-box">
          <h3>{{ t("referal_code") }}</h3>
          <div class="referal-box-value" @click="copy(walletStore.user.tg_id)">
            <span>{{ walletStore.user.tg_id }}</span>
            <img src="@/assets/copy.svg" alt="copy" />
          </div>
        </div>

        <div class="referal-box">
          <h3>{{ t("referal_link") }}</h3>
          <div
            class="referal-box-value"
            @click="
              copy(
                `https://t.me/gardawallet_bot?startapp=&referal=${walletStore.user.tg_id}`
              )
            "
          >
            <span>{{
              `https://t.me/gardawallet_bot?startapp=&referal=${walletStore.user.tg_id}`
            }}</span>
            <img src="@/assets/copy.svg" alt="copy" />
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-header">
          <div class="stats-info">
            <h2>{{ t("referals") }}</h2>
            <span class="stats-count">({{ stats.totalreferals }})</span>
          </div>
          <span class="stats-amount">{{ stats.totalAmount }} $</span>
        </div>
        <div class="referals-list">
          <div
            class="referal-item"
            v-for="(referal, index) in referals"
            :key="index"
          >
            <div class="user-info">
              <div class="wrap-img"></div>
              <div class="user-info-more">
                  <span class="user-name">@{{ referal.name }}</span>
                  <span class="reg-date"
                    >{{ t("registered") }} {{ referal.regDate }}</span
                  >
              </div>
            </div>
            <div class="user-amount">{{ referal.amount }} $</div>
          </div>
        </div>
      </div>
    </div>
    <transition name="fade">
      <div v-if="showCopiedNotification" class="copied-notification">
        {{ t("copied") }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.referal-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  width: 100%;
  padding: 20px 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header h1 {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  text-align: center;
  flex-grow: 1;
}

.back-arrow {
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.header-spacer {
  width: 24px;
}

.content {
  flex: 1;
  padding: 20px 20px 150px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.banner {
  display: flex;
  flex-direction: column;
  background-color: #141414;
  background-image: url("../../assets/bg.svg");
  background-position: center;
  background-repeat: no-repeat;
  padding: 24px;
  gap: 24px;
  justify-content: space-between;
  border-radius: 16px;
}

.banner h2 {
  color: #fff;
  font-weight: 500;
  font-size: 26px;
  line-height: 30px;
}

.referal-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  background-color: #fff;
}

.referal-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.referal-section h3 {
  font-size: 10px;
}

.referal-box-value {
  background-color: #f6f6f6;
  padding: 15px 12px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.referal-box-value span {
  font-weight: 300;
  font-size: 14px;
}
.stats-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: 16px;
}

.stats-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats-info h2 {
  font-weight: 300;
  color: #141414;
}

.stats-count {
  padding-top: 3px;
  opacity: 0.4;
  font-size: 10px;
  font-weight: 300;
}

.stats-amount {
  background-color: #deec51;
  padding: 4px 8px;
  border-radius: 4px;
  color: #141414;
  font-size: 12px;
}

.referals-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  background-color: white;
  border-radius: 12px;
  padding: 15px;
}

.referal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}


.user-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.user-info-more {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-weight: 400;
  font-size: 14px;
}

.reg-date {
  font-size: 10px;
  opacity: 0.4;
  font-weight: 300;
}

.user-amount {
  background-color: #deec51;
  padding: 4px 8px;
  border-radius: 4px;
  color: #141414;
  font-size: 12px;
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

.wrap-img {
  width: 48px;
  height: 48px;
  border-radius: 12.8px;
  overflow: hidden;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
