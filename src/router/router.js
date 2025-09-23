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
      path: "/profile/referal",
      component: () => import("../views/profile/AppReferal.vue"),
      name: "referal",
    },
    {
      path: "/create-pin",
      name: "createPin",
      component: () => import("../views/profile/PinCode.vue"),
    },
    {
      path: "/enter-pin",
      name: "enterPin",
      component: () => import("../views/profile/PinCode.vue"),
    },
    {
      path: "/history",
      component: () => import("../views/history.vue"),
      name: "history",
    },
    {
      path: "/history/transaction",
      component: () => import("../views/transaction.vue"),
      name: "transaction",
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
    {
      path: "/email_add",
      component: () => import("../views/email/email_add.vue"),
      name: "email_add",
    },
    {
      path: "/enter_code",
      component: () => import("../views/email/enter_code.vue"),
      name: "enter_code",
    },
    {
      path: "/failed_payment",
      component: () => import("../views/transaction_failed.vue"),
      name: "transaction_failed",
    },
  ],
});

export default router;
