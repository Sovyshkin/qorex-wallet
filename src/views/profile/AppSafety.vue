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
  console.log(val);
  if (!val) {
    walletStore.codePasswordActive = false;
  } else {
    // Перенаправляем на страницу установки PIN-кода при первом включении
      router.push({ name: 'createPin', query: { createMode: true } });
  }
};

const toggleHideBalance = (val) => {
  hideBalanceActive.value = val;
  walletStore.setHideBalanceActive(val);
};

const goBack = () => {
  try {
    router.push({ name: "profile" })
  } catch (err) {
    console.log(err);
    
  }
}

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
      src="../../assets/arrow-left.svg"
      alt=""
      @click="goBack()"
    />
    <h1>{{ t("safety") }}</h1>
    <div class="emp"></div>
  </header>
  <main class="safety">
    <h2 class="profile-value">{{ t("auth") }}</h2>
    <div class="auth profile-item">
      <div class="list-item" v-for="(item, i) in auth" :key="i">
        <div class="info">
          <div class="wrap-img">
            <img :src="`/assets/${item.icon}.svg`" :alt="item.icon" />
          </div>
          <span class="list-value">{{ item.name }}</span>
        </div>
        <span class="tg-name">@{{ walletStore.user.username }}</span>
      </div>
    </div>
    <h2 class="profile-value">{{ t("logIn") }}</h2>
    <div class="logIn profile-item">
      <div class="list-item">
        <div class="info">
          <div class="wrap-img">
            <img src="/assets/pin-code.svg" alt="pin-code" />
          </div>
          <span class="list-value">{{ t("code_password") }}</span>
        </div>
        <InputCheck
          :modelValue="codePasswordActive"
          @update:modelValue="toggleCodePassword"
        />
      </div>

      <div class="list-item">
        <div class="info">
          <div class="wrap-img">
            <img src="/assets/hide-balance.svg" alt="hide" />
          </div>
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
.safety {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 15px 100px 15px;
}

.profile-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.profile-value {
  color: #141414;
  font-weight: 300;
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

.info {
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

.arrow {
  height: 32px;
  width: 32px;
  transition: transform 0.3s ease;
}

.list-item:hover .arrow {
  transform: translateX(5px);
  transition: transform 0.3s ease;
}

.tg-name {
  opacity: 0.4;
  font-size: 12px;
  color: #262626;
}

.emp {
  width: 32px;
}
</style>
