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
  const email = ref("");
  const code = ref("");

  const message_status = ref("");
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

  const history = ref([
    {
      type: "buy",
      status: "success",
      amount: "3000",
      datatime: new Date(),
      transactionId: "d2tg4d72tgg6dfg...",
      currencyFrom: "USDT",
      currencyTo: "RUB",
      seller: "CodeRed-Team",
      mccCode: "1234",
    },
    {
      type: "deposit",
      status: "success",
      amount: "48.01",
      datatime: new Date(),
      transactionId: "d2tg4d72tgg6dfg...",
      currencyFrom: "USDT",
      currencyTo: "RUB",
      seller: "CodeRed-Team",
      mccCode: "1234",
    },
    {
      type: "withdrawal",
      status: "in_processing",
      amount: "48.01",
      datatime: new Date(),
      transactionId: "d2tg4d72tgg6dfg...",
      currencyFrom: "USDT",
      currencyTo: "RUB",
      seller: "CodeRed-Team",
      mccCode: "1234",
    },
    {
      type: "withdrawal",
      status: "error",
      amount: "48.01",
      datatime: new Date(),
      transactionId: "d2tg4d72tgg6dfg...",
      currencyFrom: "USDT",
      currencyTo: "RUB",
      seller: "CodeRed-Team",
      mccCode: "1234",
    },
  ]);

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
      message_status.value = "success";
      setTimeout(() => {
        message_status.value = "";
      }, 2500);
    }
    console.log(response);
  };

  const verifyPin = (enteredPin: string) => {
    return enteredPin == pinCode.value;
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
          userTg.value = JSON.parse(userString);
          localStorage.setItem("user", userTg.value);
        }
      }
    } else {
      console.log("Telegram Web App API is not available");
    }
  };

  const createUser = async () => {
    try {
      console.log(user.value);
      let response = await axios.post(`/new_user`, {
        first_name: user.value.first_name,
        last_name: user.value.last_name,
        username: user.value.username,
        tg_id: user.value.tg_id,
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
      if (usdt_price.value) {
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

  const createInvoice = async () => {
    try {
      isLoading.value = true;
      let response = await axios.post(`/create_invoces`, {
        tg_id: user.value.tg_id,
        amount: amount.value,
        cryptocurrency: "USDT_TRC20",
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
      await getPrice()
      transaction.value = { ...item };
      transaction.value.amountRub = getRub(item.amount);
      router.push({ name: "transaction" });
    } catch (err) {
      console.log(err);
    }
  };

  const getRub = (amount) => {
    try {
      return `${Math.round(amount * usdt_price.value * 100) / 100}`
    } catch (err) {
      console.log(err);
    }
  }

  return {
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
    createUser,
  };
});
