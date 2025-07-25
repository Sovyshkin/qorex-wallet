import { defineStore } from "pinia";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import i18n from "@/i18n";
import { useRouter } from "vue-router";
import Cookies from 'js-cookie';

export const useWalletStore = defineStore("wallet", () => {
  const balance = ref(0);
  const { t } = useI18n();
  const router = useRouter();

  const codePasswordActive = ref(false);
  const hideBalanceActive = ref(false);

  const savedLang = localStorage.getItem("lang") || "RU";
  i18n.global.locale = savedLang;
  const langs = ref([
    {
      name: "Русский",
      value: "RU",
      active: savedLang == "RU",
    },
    {
      name: "English",
      value: "EN",
      active: savedLang == "EN",
    },
  ]);

  const changeLang = (lang: string) => {
    try {
      langs.value = langs.value.map((language) => ({
        ...language,
        active: language.value === lang,
      }));
      i18n.global.locale = lang;
      localStorage.setItem("lang", lang);
      location.reload();
    } catch (err) {
      console.log(err);
    }
  };

  const goBack = () => {
    try {
      router.go(-1);
    } catch (err) {
      console.log(err);
    }
  };

  return {
    balance,
    changeLang,
    goBack,
    langs,
    codePasswordActive,
    hideBalanceActive,
  };
});