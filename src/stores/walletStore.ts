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
  const referalId = ref(""); // Добавляем переменную для реферального ID

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
      // Сохраняем пин-код в куки для быстрого доступа (но основным источником остается база данных)
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
    
  };

  const verifyPin = (enteredPin: string) => {
    // Если пин-код не загружен из базы данных, возвращаем false
    if (!pinCode.value) {
      
      // Автоматически отключаем пин-код если он не найден
      clearAllPinData();
      return false;
    }
    
    return enteredPin == pinCode.value;
  };

  const hasPinCode = () => {
    // Проверяем наличие пин-кода в переменной (загруженного из базы данных)
    const hasPin = !!pinCode.value;
    
    // Если пин-кода нет, очищаем все связанные настройки
    if (!hasPin) {
      clearAllPinData();
    }
    
    return hasPin;
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

const clearAllPinData = () => {
  
  pinCode.value = "";
  codePasswordActive.value = false;
  localStorage.removeItem('hasPinCode');
  localStorage.removeItem('pinVerified');
  Cookies.remove('pinCode');
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
    
  }
};

  const goBack = () => {
    try {
      router.go(-1);
    } catch (err) {
      
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
        
        // Извлекаем реферальный ID из start_param
        if (start_param) {
          console.log('start_param:', start_param);
          
          // Если start_param содержит реферальную информацию в формате referal=ID
          if (start_param.includes('referal=')) {
            const referalMatch = start_param.match(/referal=(\d+)/);
            if (referalMatch) {
              referalId.value = referalMatch[1];
              console.log('Найден реферальный ID в start_param:', referalId.value);
            }
          }
          // Если start_param это просто число (ID реферера)
          else if (/^\d+$/.test(start_param)) {
            referalId.value = start_param;
            console.log('Найден реферальный ID как число в start_param:', referalId.value);
          }
        }
        
        // Также проверяем другие возможные источники реферальных данных
        try {
          // Проверяем URL параметры из самой реферральной ссылки
          const urlParams = new URLSearchParams(window.location.search);
          const referalFromUrl = urlParams.get('referal');
          if (referalFromUrl && !referalId.value) {
            referalId.value = referalFromUrl;
            console.log('Найден реферальный ID в URL:', referalId.value);
          }
          
          // Проверяем hash для случаев когда параметры передаются через #
          const hash = window.location.hash;
          if (hash && hash.includes('referal=') && !referalId.value) {
            const referalMatch = hash.match(/referal=(\d+)/);
            if (referalMatch) {
              referalId.value = referalMatch[1];
              console.log('Найден реферальный ID в hash:', referalId.value);
            }
          }
          
          // Проверяем параметр startapp
          const startApp = urlParams.get('startapp');
          if (startApp && startApp.includes('referal=') && !referalId.value) {
            const referalMatch = startApp.match(/referal=(\d+)/);
            if (referalMatch) {
              referalId.value = referalMatch[1];
              console.log('Найден реферальный ID в startapp:', referalId.value);
            }
          }
        } catch (error) {
          console.log('Ошибка при парсинге URL параметров:', error);
        }
        
        if (userString) {
          userTg.value = JSON.parse(userString);
          localStorage.setItem("user", JSON.stringify(userTg.value));
          if (start_param == 'error_trasaction') {
            router.push({ name: 'transaction_failed' })
          }
        }
      }
    } else {
      
    }
  };

  const createUser = async () => {
    try {
      
      const userData: any = {
        first_name: userTg.value.first_name,
        last_name: userTg.value.last_name,
        username: userTg.value.username,
        tg_id: String(userTg.value.id),
      };
      
      console.log(referalId.value);
      
      if (referalId.value) {
        userData.whoreferal = referalId.value;
        console.log('Отправляем пользователя с реферальным ID:', referalId.value);
      }
      
      let response = await axios.post(`/new_user`, userData);
      
    } catch (err) {
      
    }
  };

  // Функция для тестирования извлечения реферального ID
  const testReferalExtraction = () => {
    console.log('=== Тест извлечения реферального ID ===');
    console.log('Текущий referalId:', referalId.value);
    console.log('URL:', window.location.href);
    console.log('Search params:', window.location.search);
    console.log('Hash:', window.location.hash);
    
    if (window.Telegram && window.Telegram.WebApp) {
      console.log('Telegram WebApp initData:', window.Telegram.WebApp.initData);
    }
    
    return referalId.value;
  };

  const getUser = async () => {
    try {
      let response = await axios.get(`/user/${userTg.value.id}`);
      
      user.value = response.data;
      balance.value = response.data.balance || 0;
      pinCode.value = response.data.pin_code;
      
      // Устанавливаем состояние активности пин-кода на основе его наличия
      codePasswordActive.value = !!response.data.pin_code;
      
      history.value = response.data.list_transctions_replenished;
      
      
      if (history.value && history.value.length > 0) {
        
        
      }
      
      if (usdt_price.value) {
        balance_rub.value = balance.value * usdt_price.value;
      } else {
        await getPrice();
        balance_rub.value = balance.value * usdt_price.value;
      }
      
    } catch (err) {
      
      if (err.status == 404 || err.status == 500) {
        await createUser();
      }
    }
  };

  const getPrice = async () => {
    try {
      let response = await axios.get("/last_price");
      
      usdt_price.value = response.data.last_price;
    } catch (err) {
      
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
      
  
      if (response.data.result) {
        pay_link.value = response.data.result.link;
        working_invoice = response.data.result.uuid;
        await creatingInvoceDb();
        window.location.href = pay_link.value;
      }
    } catch (err) {
      
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
      
    } catch (err) {
      
    } finally {
      isLoading.value = false;
    }
  };

  const logOut = () => {
    try {
      localStorage.clear();
      router.push("/");
    } catch (err) {
      
    }
  };

  const updateEmail = async () => {
    try {
      isLoading.value = true;
      let response = await axios.patch(`/update_email/${user.value.tg_id}`, {
        email: email.value,
      });
      
    } catch (err) {
      
    } finally {
      isLoading.value = false;
    }
  };

  const sendCode = async () => {
    try {
      isLoading.value = true;
      let response = await axios.patch(`/send_code?email=${email.value}`);
      
      if (response.status == 200) {
        router.push({ name: "enter_code" });
      }
    } catch (err) {
      
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
      
      if (response.status == 200) {
        message_status.value = "success";
        setTimeout(() => {
          message_status.value = "";
          router.push({ name: "profile" });
        }, 2500);
      }
    } catch (err) {
      
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
      
      
      router.push({ name: "transaction" });
    } catch (err) {
      
    }
  };

  const getRub = (amount) => {
    try {
      return `${Math.round(amount * usdt_price.value * 100) / 100}`;
    } catch (err) {
      
    }
  };

  const qrTake = async (link: string) => {
    try {
      loaderScan.value = true;
      
      // Парсим URL и извлекаем параметры
      const url = new URL(link);
      const bank = url.searchParams.get('bank') || '';
      const sum = url.searchParams.get('sum') || '';
      const cur = url.searchParams.get('cur') || '';
      const crc = url.searchParams.get('crc') || '';
      
      // Отправляем данные как query параметры
      const params = new URLSearchParams({
        tg_id: String(userTg.value.id),
        qr_url: link,
        bank: bank,
        sum: sum,
        cur: cur,
        crc: crc
      });
      
      let response = await axios.post(`/qr_take?${params.toString()}`, {});
      
      
      if (response.status == 200) {
        let { id, datatime } = response.data.more_detail
        let { type_trans, bool_suecess } = response.data
        let amount_usdt = response.data.more_detail.amount
        await getPrice()
        let amount_rub = amount_usdt * usdt_price.value
        router.push({ name: "transaction", query: { id, amount_rub, amount_usdt, datatime, type_trans, bool_suecess } });
      }
    } catch (err) {
      
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
    clearAllPinData,
    initializePinState,
    createUser,
    roundToHundredths,
    errMessage,
    referalId,
    testReferalExtraction
  };
});
