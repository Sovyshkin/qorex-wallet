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

  const user = ref({})
  const codePasswordActive = ref(false);
  const hideBalanceActive = ref(false);
  const pinCode = ref(Cookies.get('pinCode') || ""); // Загружаем из куков при инициализации
  const isPinVerified = ref(false);

  const setCodePasswordActive = (val: boolean) => {
    codePasswordActive.value = val;
  };

  const setHideBalanceActive = (val: boolean) => {
    hideBalanceActive.value = val;
  };

  const setPinVerified = (val: boolean) => {
    isPinVerified.value = val;
  };

  const setPinCode = (pin: string) => {
    pinCode.value = pin;
    Cookies.set('pinCode', pin, { expires: 365 }); // Сохраняем в куки на год
  };

  const verifyPin = (enteredPin: string) => {
    isPinVerified.value = enteredPin === pinCode.value;
    return isPinVerified.value;
  };

  const hasPinCode = () => {
    return !!pinCode.value;
  };

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

  const getChatID = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        const initData = window.Telegram.WebApp.initData;
        if (initData) {
          const decodedInitData = decodeURIComponent(initData);
          const params = new URLSearchParams(decodedInitData);
          const userString = params.get("user");
          if (userString) {
            user.value = JSON.parse(userString);
            console.log(user.value);
            localStorage.setItem("chatID", user.value.id);
          }
        }
      } else {
        console.log("Telegram Web App API is not available");
      }
    }

  return {
    getChatID,
    user,
    balance,
    changeLang,
    goBack,
    langs,
    codePasswordActive,
    hideBalanceActive,
    pinCode,
    isPinVerified,
    verifyPin,
    hasPinCode,
    setCodePasswordActive,
    setHideBalanceActive,
    setPinVerified,
    setPinCode
  };
});