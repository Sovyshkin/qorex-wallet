<script setup>
import { ref, onMounted } from "vue";
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
const referals = ref([]);

// Общая статистика
const stats = ref({
  totalreferals: 0,
  totalAmount: "0",
});

// Функция для загрузки рефералов
const loadReferrals = async () => {
  try {
    const data = await walletStore.getMyReferrals();
    if (data && Array.isArray(data)) {
      referals.value = data;
      stats.value.totalreferals = data.length;
      
      // Подсчитываем общую сумму заработанных денег
      const totalEarned = data.reduce((sum, referal) => {
        return sum + parseFloat(referal.referral_only_pay || 0);
      }, 0);
      stats.value.totalAmount = walletStore.roundToHundredths(totalEarned);
    }
  } catch (error) {
    // Silently handle error
  }
};

// Форматирование даты
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  } catch {
    return dateString;
  }
};

onMounted(() => {
  loadReferrals();
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
          <h3>{{ t("referal_link") }}</h3>
          <div
            class="referal-box-value"
            @click="
              copy(
                `https://t.me/gardawallet_bot?startapp=referal_${walletStore.userTg.id}`
              )
            "
          >
            <span>{{
              `https://t.me/gardawallet_bot?startapp=referal_${walletStore.userTg.id}`
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
        
        <!-- Показываем загрузку -->
        <div v-if="walletStore.isLoading" class="loading-state">
          <div class="loading-spinner">
            <img src="@/assets/cat-loader.svg" alt="Loading...">
          </div>
          <p>{{ t("loading") }}...</p>
        </div>
        
        <!-- Показываем список рефералов или пустое состояние -->
        <div v-else class="referals-list">
          <div
            class="referal-item"
            v-for="(referal, index) in referals"
            :key="index"
            v-if="referals.length > 0"
          >
            <div class="user-info">
              <div class="wrap-img"></div>
              <div class="user-info-more">
                  <span class="user-name">@{{ referal.username || referal.first_name || 'Пользователь' }}</span>
                  <span class="reg-date"
                    >{{ t("earned") }}: {{ walletStore.roundToHundredths(referal.referral_only_pay || 0) }} $</span
                  >
              </div>
            </div>
            <div class="user-amount">{{ walletStore.roundToHundredths(referal.referral_only_pay || 0) }} $</div>
          </div>
          
          <div v-if="referals.length === 0" class="empty-referals">
            <div class="empty-icon">
              <img src="@/assets/referal.svg" alt="">
            </div>
            <h3 class="empty-title">{{ t("no_referals_yet") }}</h3>
            <p class="empty-description">
              {{ t("no_referals_description") }}
            </p>
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
  <!-- <div class="container">
        <img src="../../assets/cat-loader.svg" alt="">
        {{ t('in_development') }}...
    </div> -->
</template>

<style scoped>
.container {
    height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    font-size: 20px;
    font-weight: 600s;
    padding: 10px;
}
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

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  gap: 16px;
  background-color: white;
  border-radius: 12px;
}

.loading-spinner img {
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.empty-referals {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  gap: 16px;
  animation: fadeIn 0.5s ease-in-out;
}

.empty-icon {
  background-color: #deec51;
  padding: 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}

.empty-title {
  font-size: 18px;
  font-weight: 500;
  color: #141414;
  margin: 0;
}

.empty-description {
  font-size: 14px;
  font-weight: 300;
  color: #666;
  line-height: 1.5;
  margin: 0;
  max-width: 280px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(222, 236, 81, 0.3);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(222, 236, 81, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(222, 236, 81, 0);
  }
}
</style>
