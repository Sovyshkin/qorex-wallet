import { defineStore } from "pinia";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import i18n from "@/i18n";
import { useRouter } from "vue-router";
import Cookies from "js-cookie";
import axios from "axios";

export const useWalletStore = defineStore("wallet", () => {
  const balance = ref(0);
  const balance_rub = ref(0);
  const usdt_price = ref(0);
  let working_invoice = "";
  const { t } = useI18n();
  const router = useRouter();
  const isLoading = ref(false);
  const loaderScan = ref(false);
  const email = ref("");
  const code = ref("");
  const errMessage = ref('');

  const message_status = ref("");
  // const userTg = ref({})
  const userTg = ref({
    first_name: "Вадим",
    last_name: "Заньков",
    username: "zankov_22",
    id: "978664527",
  });
  const user = ref({});
  const amount = ref("");
  const pay_link = ref("");
  const codePasswordActive = ref(false);
  const hideBalanceActive = ref(false);
  const pinCode = ref("");

  const history = ref([]);

  const transaction = ref({});

  const setHideBalanceActive = (val: boolean) => {
    hideBalanceActive.value = val;
  };

  const setPinCode = async (pin: string) => {
  pinCode.value = pin;
  let response = await axios.patch(`/update_pincode/${user.value.tg_id}`, {
    pincode: pinCode.value,
  });
  if (response.status == 200) {
    Cookies.set("pinCode", pin, { expires: 365 });
    localStorage.setItem('hasPinCode', 'true');
    localStorage.setItem('pinVerified', Date.now().toString()); // Автоматически верифицируем
    message_status.value = "success";
    codePasswordActive.value = true;
    setTimeout(() => {
      message_status.value = "";
      router.push({ name: "safety" })
    }, 2500);
  }
  console.log(response);
};

  const verifyPin = (enteredPin: string) => {
    pinCode.value = Cookies.get('pinCode')
    
    return enteredPin == pinCode.value;
  };

  const hasPinCode = () => {
    return !!pinCode.value;
  };

  const verifyAndStorePin = (enteredPin: string) => {
  if (verifyPin(enteredPin)) {
    // Сохраняем время успешного ввода PIN
    localStorage.setItem('pinVerified', Date.now().toString());
    localStorage.setItem('hasPinCode', 'true');
    return true;
  }
  return false;
};

const clearPinSession = () => {
  localStorage.removeItem('pinVerified');
};

const initializePinState = () => {
  if (pinCode.value) {
    localStorage.setItem('hasPinCode', 'true');
  }
};

const savedLang = localStorage.getItem("lang") || "RU";
i18n.global.locale = savedLang;
const availableLanguages = [
  { name: "Русский", value: "RU" },
  { name: "English", value: "EN" },
];

const langs = ref(
  availableLanguages.map(language => ({
    ...language,
    active: language.value === savedLang // Сравниваем с сохраненным языком
  }))
);

const changeLang = async (lang: string) => {
  try {
    // Проверяем, что язык существует
    const languageExists = availableLanguages.some(l => l.value === lang);
    if (!languageExists) {
      console.warn(`Language ${lang} is not supported`);
      return;
    }

    // Обновляем состояние
    langs.value = langs.value.map(language => ({
      ...language,
      active: language.value === lang
    }));
    
    // Устанавливаем язык
    i18n.global.locale = lang;
    localStorage.setItem("lang", lang);
    
    location.reload();
    
  } catch (err) {
    console.error("Error changing language:", err);
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
        const start_param = params.get("start_param");
        if (userString) {
          userTg.value = JSON.parse(userString);
          localStorage.setItem("user", userTg.value);
          if (start_param == 'error_trasaction') {
            router.push({ name: 'transaction_failed' })
          }
        }
      }
    } else {
      console.log("Telegram Web App API is not available");
    }
  };

  const createUser = async () => {
    try {
      console.log(userTg.value);
      let response = await axios.post(`/new_user`, {
        first_name: userTg.value.first_name,
        last_name: userTg.value.last_name,
        username: userTg.value.username,
        tg_id: String(userTg.value.id),
      });
      console.log(response);
    } catch (err) {
      console.log(err);
    }
  };

  const getUser = async () => {
    try {
      let response = await axios.get(`/user/${userTg.value.id}`);
      console.log(response);
      user.value = response.data;
      balance.value = response.data.balance || 0;
      pinCode.value = response.data.pin_code;
      history.value = response.data.list_transctions_replenished;
      if (usdt_price.value) {
        balance_rub.value = balance.value * usdt_price.value;
      } else {
        await getPrice();
        balance_rub.value = balance.value * usdt_price.value;
      }
      console.log(balance.value);
    } catch (err) {
      console.log(err);
      if (err.status == 404 || err.status == 500) {
        await createUser();
      }
    }
  };

  const getPrice = async () => {
    try {
      let response = await axios.get("/last_price");
      console.log(response);
      usdt_price.value = response.data.last_price;
    } catch (err) {
      console.log(err);
    }
  };

  const createInvoice = async (cryptocurrency = "USDT_TRC20") => {
    try {
      isLoading.value = true;
      let response = await axios.post(`/create_invoces`, {
        tg_id: user.value.tg_id,
        amount: amount.value,
        cryptocurrency: cryptocurrency,
      });
      console.log(response);
  
      if (response.data.result) {
        pay_link.value = response.data.result.link;
        working_invoice = response.data.result.uuid;
        await creatingInvoceDb();
        window.location.href = pay_link.value;
      }
    } catch (err) {
      console.log(err);
    } finally {
      isLoading.value = false;
    }
  };

  const creatingInvoceDb = async () => {
    try {
      isLoading.value = true;
      let response = await axios.post("/creating_invoce_db", {
        datatime: new Date(),
        amount: String(amount.value),
        id_tg_user: user.value.tg_id,
        working_invoce: working_invoice,
      });
      console.log(response);
    } catch (err) {
      console.log(err);
    } finally {
      isLoading.value = false;
    }
  };

  const logOut = () => {
    try {
      localStorage.clear();
      router.push("/");
    } catch (err) {
      console.log(err);
    }
  };

  const updateEmail = async () => {
    try {
      isLoading.value = true;
      let response = await axios.patch(`/update_email/${user.value.tg_id}`, {
        email: email.value,
      });
      console.log(response);
    } catch (err) {
      console.log(err);
    } finally {
      isLoading.value = false;
    }
  };

  const sendCode = async () => {
    try {
      isLoading.value = true;
      let response = await axios.patch(`/send_code?email=${email.value}`);
      console.log(response);
      if (response.status == 200) {
        router.push({ name: "enter_code" });
      }
    } catch (err) {
      console.log(err);
    } finally {
      isLoading.value = false;
    }
  };

  const checkCode = async () => {
    try {
      isLoading.value = true;
      let response = await axios.patch(
        `/check_code?email=${email.value}&code=${code.value}&tg_id=${user.value.tg_id}`
      );
      code.value = "";
      console.log(response);
      if (response.status == 200) {
        message_status.value = "success";
        setTimeout(() => {
          message_status.value = "";
          router.push({ name: "profile" });
        }, 2500);
      }
    } catch (err) {
      console.log(err);
      message_status.value = "error";
      setTimeout(() => {
        message_status.value = "";
      }, 2500);
    } finally {
      isLoading.value = false;
    }
  };

  const goTransaction = async (item) => {
    try {
      await getPrice();
      transaction.value = { ...item };
      transaction.value.amountRub = getRub(item.amount);
      console.log(transaction.value);
      
      router.push({ name: "transaction" });
    } catch (err) {
      console.log(err);
    }
  };

  const getRub = (amount) => {
    try {
      return `${Math.round(amount * usdt_price.value * 100) / 100}`;
    } catch (err) {
      console.log(err);
    }
  };

  const qrTake = async (link: string) => {
    try {
      loaderScan.value = true;
      let response = await axios.post(
        `/qr_take?tg_id=${user.value.tg_id}&qr_url=${link}&balance=${balance.value}`,
        {}
      );
      console.log('qr_take', response);
      if (response.status == 200) {
        let { id, datatime } = response.data.more_detail
        let { type_trans, bool_suecess } = response.data
        let amount_usdt = response.data.more_detail.amount
        await getPrice()
        let amount_rub = amount_usdt * usdt_price.value
        router.push({ name: "transaction", query: { id, amount_rub, amount_usdt, datatime, type_trans, bool_suecess } });
      }
    } catch (err) {
      console.log(err);
      if (err.response.data.detail == 'Недостаточно средств') {
        errMessage.value = t('insufficient_funds')
      } else {
        errMessage.value = t('failed_text')
      }
      router.push({ name: "transaction_failed" });
    } finally {
      loaderScan.value = false;
    }
  };


  const roundToHundredths = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '0.00'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '0.00'
  const truncatedValue = Math.floor(numValue * 100) / 100
  return truncatedValue.toFixed(2)
}

  return {
    qrTake,
    getRub,
    goTransaction,
    transaction,
    history,
    code,
    checkCode,
    sendCode,
    updateEmail,
    email,
    isLoading,
    loaderScan,
    logOut,
    balance_rub,
    pay_link,
    amount,
    createInvoice,
    creatingInvoceDb,
    message_status,
    usdt_price,
    getPrice,
    getUserInfo,
    user,
    userTg,
    getUser,
    balance,
    changeLang,
    goBack,
    langs,
    codePasswordActive,
    hideBalanceActive,
    pinCode,
    verifyPin,
    hasPinCode,
    setHideBalanceActive,
    setPinCode,
    verifyAndStorePin,
    clearPinSession,
    initializePinState,
    createUser,
    roundToHundredths,
    errMessage
  };
});
