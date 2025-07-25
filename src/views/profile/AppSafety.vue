<
<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useWalletStore } from "../../stores/walletStore.ts";
import { useRouter } from "vue-router";
import InputCheck from "@/components/ui/inputs/InputCheck.vue";

const { t } = useI18n();
const walletStore = useWalletStore();
const router = useRouter();

const auth = ref([
  {
    name: t("telegram"),
    icon: "telegram",
  },
]);

// Отдельные состояния для чекбоксов
const codePasswordActive = ref(walletStore.codePasswordActive);
const hideBalanceActive = ref(walletStore.hideBalanceActive);

// Обработчик изменения защиты PIN-кодом
const toggleCodePassword = (val) => {
  codePasswordActive.value = val;
  walletStore.setCodePasswordActive(val);

  if (!val) {
    walletStore.setPinVerified(false);
  } else {
    // Перенаправляем на страницу установки PIN-кода при первом включении
    if (!walletStore.pinCode) {
      router.push("/profile/pin-code?setup=true");
    }
  }
};

const toggleHideBalance = (val) => {
  hideBalanceActive.value = val;
  walletStore.setHideBalanceActive(val);
};

watch(
  () => walletStore.codePasswordActive,
  (val) => {
    codePasswordActive.value = val;
  }
);

watch(
  () => walletStore.hideBalanceActive,
  (val) => {
    hideBalanceActive.value = val;
  }
);
</script>

<template>
  <header class="header">
    <img
      class="arrow"
      src="../../assets/arrow-left.png"
      alt=""
      @click="walletStore.goBack()"
    />
    <h1>{{ t("safety") }}</h1>
    <div class="emp"></div>
  </header>
  <main class="safety">
    <h2 class="profile-value">{{ t("auth") }}</h2>
    <div class="auth profile-item">
      <div class="list-item" v-for="(item, i) in auth" :key="i">
        <div class="info">
          <img :src="`/assets/${item.icon}.png`" :alt="item.icon" />
          <span class="list-value">{{ item.name }}</span>
        </div>
        <span class="tg-name">@username</span>
      </div>
    </div>
    <h2 class="profile-value">{{ t("logIn") }}</h2>
    <div class="logIn profile-item">
      <!-- Защита PIN-кодом -->
      <div class="list-item">
        <div class="info">
          <img src="/assets/pin-code.png" alt="pin-code" />
          <span class="list-value">{{ t("code_password") }}</span>
        </div>
        <InputCheck
          :modelValue="codePasswordActive"
          @update:modelValue="toggleCodePassword"
        />
      </div>

      <!-- Скрытие баланса -->
      <div class="list-item">
        <div class="info">
          <img src="/assets/hide.png" alt="hide" />
          <span class="list-value">{{ t("hide_balance") }}</span>
        </div>
        <InputCheck
          :modelValue="hideBalanceActive"
          @update:modelValue="toggleHideBalance"
        />
      </div>
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

.arrow {
  height: 18px;
}

h1 {
  font-size: 18px;
  font-weight: 600;
}
.safety {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 10px 100px 10px;
}

.profile-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background-color: #fff;
  padding: 10px 15px;
  border-radius: 20px;
  margin-bottom: 20px;
}

.profile-value {
  font-size: 14px;
  color: #b2aaaa;
  font-weight: 600;
  padding-left: 10px;
}

.list-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.list-value {
  font-size: 16px;
  font-weight: 600;
}

.info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info img {
  height: 24px;
  width: 24px;
}

.arrow {
  height: 14px;
  transition: transform 0.3s ease;
}

.list-item:hover .arrow {
  transform: translateX(5px);
  transition: transform 0.3s ease;
}

.exit {
  color: rgb(244, 44, 44);
  font-weight: 600;
  font-size: 16px;
}

.user {
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.wrap-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wrap-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 600;
  font-size: 16px;
}

.tg-name {
  color: #888;
  font-size: 14px;
  font-weight: 500;
}
</style>
