import { defineStore } from "pinia";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import i18n from "@/i18n";
import { useRouter } from "vue-router";
import Cookies from 'js-cookie';
import axios from 'axios'

export const useWalletStore = defineStore("wallet", () => {
  const balance = ref(0);
  const usdt_price = ref(0)
  const { t } = useI18n();
  const router = useRouter();

  const message_status = ref('')
  const user = ref({
    first_name: 'Вадим',
    last_name: 'Заньков',
    username: 'zankov_22',
    id: '666999'
  })
  const codePasswordActive = ref(false);
  const hideBalanceActive = ref(false);
  const pinCode = ref();
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

  const setPinCode = async (pin: string) => {
    pinCode.value = pin;
    let response = await axios.patch(`/update_pincode/${user.value.id}`, {
      pincode: pinCode.value
    })
    if (response.status == 200) {
      Cookies.set('pinCode', pin, { expires: 365 });
      message_status.value = 'success'
      setTimeout(() => {
        message_status.value = ''
      }, 2500)
    }
    console.log(response);
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

  const getUserInfo = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        const initData = window.Telegram.WebApp.initData;
        if (initData) {
          const decodedInitData = decodeURIComponent(initData);
          const params = new URLSearchParams(decodedInitData);
          const userString = params.get("user");
          if (userString) {
            user.value = JSON.parse(userString);
            localStorage.setItem("user", user.value);
          }
        }
      } else {
        console.log("Telegram Web App API is not available");
      }
    }

  const createUser = async () => {
    try {
      console.log(user.value);
      let response = await axios.post(`/new_user`, {
        first_name: user.value.first_name,
        last_name: user.value.last_name,
        username: user.value.username,
        tg_id: user.value.id,
      })
      console.log(response);
    } catch (err) {
      console.log(err);
      
    }
  }

  const getUser = async () => {
    try {
      let response = await axios.get(`/user/${user.value.id}`)
      console.log(response);
    } catch (err) {
      console.log(err);
      if (err.status == 404) {
        await createUser()
      }
    }
  }

  const getPrice = async () => {
    try {
      let response = await axios.get('/last_price')
      console.log(response);
      usdt_price.value = response.data.last_price
    } catch (err) {
      console.log(err);
      
    }
  }

  return {
    message_status,
    usdt_price,
    getPrice,
    getUserInfo,
    user,
    getUser,
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
    setPinCode,
    createUser
  };
});