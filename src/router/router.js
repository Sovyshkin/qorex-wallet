import { createRouter, createWebHistory } from "vue-router";
import { useWalletStore } from "@/stores/walletStore";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: () => import("../views/main.vue"),
      name: "main",
    },
    {
      path: "/profile",
      component: () => import("../views/profile.vue"),
      name: "profile",
    },
    {
      path: "/browser",
      component: () => import("../views/browser.vue"),
      name: "browser",
    },
    {
      path: "/profile/select-lang",
      component: () => import("../views/profile/SelectLang.vue"),
      name: "select_lang",
    },
    {
      path: "/profile/safety",
      component: () => import("../views/profile/AppSafety.vue"),
      name: "safety",
    },
    {
      path: "/profile/devices",
      component: () => import("../views/profile/AppDevices.vue"),
      name: "devices",
    },
    {
      path: "/profile/info",
      component: () => import("../views/profile/AppInfo.vue"),
      name: "info",
    },
    {
      path: "/profile/accounts",
      component: () => import("../views/profile/OfficialAccounts.vue"),
      name: "accounts",
    },
    {
      path: "/create-pin",
      name: "CreatePin",
      component: () => import("../views/profile/PinCode.vue"),
      beforeEnter: (to, from, next) => {
        const walletStore = useWalletStore();
        walletStore.hasPinCode() ? next("/enter-pin") : next();
      },
    },
    {
      path: "/enter-pin",
      name: "EnterPin",
      component: () => import("../views/profile/PinCode.vue"),
    },
    {
      path: "/history",
      component: () => import("../views/history.vue"),
      name: "history",
    },
    {
      path: "/scanner",
      component: () => import("../views/scanner.vue"),
      name: "scanner",
    },
    {
      path: "/deposit",
      component: () => import("../views/deposit.vue"),
      name: "deposit",
    },
  ],
});

export default router;
