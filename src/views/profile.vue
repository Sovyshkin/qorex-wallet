<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useWalletStore } from "@/stores/walletStore";

const walletStore = useWalletStore();
const { t } = useI18n();
const router = useRouter();
const params = ref([
  {
    name: t("safety"),
    icon: "safety",
    route: "safety",
  },
  {
    name: t("lang"),
    icon: "lang",
    route: "select_lang",
  },
  {
    name: t("devices"),
    icon: "devices",
    route: "devices",
  },
]);

const aboutUs = ref([
  {
    name: t("official_accounts"),
    icon: "telegram",
    route: "accounts",
  },
  {
    name: t("faq"),
    icon: "faq",
    route: "faq",
  },
  {
    name: t("info"),
    icon: "info",
    route: "info",
  },
]);

const referal = ref([
  {
    name: t("referal"),
    icon: "referal",
    route: "referal",
  },
]);

const support = ref([
  {
    name: t("support"),
    icon: "support",
    route: "support",
  },
]);

const goRoute = (route) => {
  try {
    router.push({ name: route });
  } catch (err) {
    console.log(err);
  }
};
</script>

<template>
  <main class="profile">
    <div class="user profile-item">
      <div class="wrap-avatar">
        <img :src="walletStore.user.photo_url" alt="" />
      </div>
      <span class="name">@{{ walletStore.user.username }}</span>
    </div>
    <div class="referal profile-item">
      <div
        class="list-item"
        v-for="(item, i) in referal"
        :key="i"
        @click="goRoute(item.route)"
      >
        <div class="info">
          <div class="wrap-img">
            <img :src="`/assets/${item.icon}.svg`" :alt="item.icon" />
          </div>
          <span class="list-value">{{ item.name }}</span>
        </div>
        <img class="arrow" src="../assets/arrow-right.svg" alt="arrow-right" />
      </div>
    </div>
    <h2 class="profile-value">{{ t("params") }}</h2>
    <div class="params profile-item">
      <div
        class="list-item"
        v-for="(item, i) in params"
        :key="i"
        @click="goRoute(item.route)"
      >
        <div class="info">
          <div class="wrap-img">
            <img :src="`/assets/${item.icon}.svg`" :alt="item.icon" />
          </div>
          <span class="list-value">{{ item.name }}</span>
        </div>
        <img class="arrow" src="../assets/arrow-right.svg" alt="arrow-right" />
      </div>
    </div>
    <h2 class="profile-value">{{ t("aboutUs") }}</h2>
    <div class="about-us profile-item">
      <div
        class="list-item"
        v-for="(item, i) in aboutUs"
        :key="i"
        @click="goRoute(item.route)"
      >
        <div class="info">
          <div class="wrap-img">
            <img :src="`/assets/${item.icon}.svg`" :alt="item.icon" />
          </div>
          <span class="list-value">{{ item.name }}</span>
        </div>
        <img class="arrow" src="../assets/arrow-right.svg" alt="arrow-right" />
      </div>
    </div>
    <div class="about-us profile-item">
      <div
        class="list-item"
        v-for="(item, i) in support"
        :key="i"
        @click="goRoute(item.route)"
      >
        <div class="info">
          <div class="wrap-img">
            <img :src="`/assets/${item.icon}.svg`" :alt="item.icon" />
          </div>
          <span class="list-value">{{ item.name }}</span>
        </div>
        <img class="arrow" src="../assets/arrow-right.svg" alt="arrow-right" />
      </div>
    </div>
    <button class="btn exit profile-item">{{ t("exit") }}</button>
  </main>
</template>

<style scoped>
.profile {
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
  height: 24px;
  width: 24px;
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
  align-items: center;
  gap: 10px;
  background-color: #fff;
  padding: 16px;
  border-radius: 16px;
}

.wrap-avatar {
  width: 64px;
  height: 64px;
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

.name {
  font-size: 20px;
  color: #141414;
}
</style>
