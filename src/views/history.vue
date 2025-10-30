<script setup>
import EmptyHistory from "@/components/EmptyHistory.vue";
import { useWalletStore } from "@/stores/walletStore";
import { useI18n } from "vue-i18n";
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

const walletStore = useWalletStore();
const { t } = useI18n();
const router = useRouter();

const parseCustomDate = (dateString) => {
  
  if (!dateString) {
    return new Date();
  }
  
  // Если это уже объект Date
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // Преобразуем в строку если это число
  const dateStr = String(dateString);
  
  // Проверяем формат DD.MM.YYYY-HH:MM:SS (например, 14.10.2025-10:42:45)
  if (/^\d{2}\.\d{2}\.\d{4}-\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
    const [datePart, timePart] = dateStr.split('-');
    const [day, month, year] = datePart.split('.');
    const [hours, minutes, seconds] = timePart.split(':');
    
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1, // Месяцы от 0 до 11
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
    
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Проверяем формат YYYY-MM-DD-HH-MM-SS (например, 2025-10-14-10-03-07)
  if (/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const [year, month, day, hours, minutes, seconds] = parts;
    
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1, // Месяцы от 0 до 11
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
    
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Проверяем формат YYYYMMDDHHMMSS (14 символов)
  if (dateStr.length === 14 && /^\d{14}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Месяцы от 0 до 11
    const day = parseInt(dateStr.substring(6, 8));
    const hours = parseInt(dateStr.substring(8, 10));
    const minutes = parseInt(dateStr.substring(10, 12));
    const seconds = parseInt(dateStr.substring(12, 14));
    
    const date = new Date(year, month, day, hours, minutes, seconds);
    
    return date;
  }
  
  // Проверяем формат YYYY-MM-DD HH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(dateStr)) {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  
  // Проверяем timestamp (unix время в миллисекундах)
  if (/^\d+$/.test(dateStr) && dateStr.length >= 10) {
    const timestamp = parseInt(dateStr);
    // Если это секунды, преобразуем в миллисекунды
    const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const date = new Date(timestampMs);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Пробуем стандартное преобразование даты
  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  
  return new Date(); // Возвращаем текущую дату если формат неверный
};

const getGroupKey = (dateString) => {
  const date = parseCustomDate(dateString);
  const key = date.toLocaleDateString("ru-RU");
  return key;
};

const formatDisplayDate = (dateString) => {
  const date = parseCustomDate(dateString);
  const formatted = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long"
  });
  return formatted;
};

const groupedHistory = computed(() => {
  try {
    const groups = {};

    walletStore.history.forEach((item, index) => {
      const dateKey = getGroupKey(item.datatime); // Уникальный ключ для группировки
      const displayDate = formatDisplayDate(item.datatime); // Отображаемая дата

      if (!groups[dateKey]) {
        groups[dateKey] = {
          displayDate: displayDate, // Сохраняем отображаемую дату
          items: []
        };
      }
      groups[dateKey].items.push(item);
    });
    
    // Сортируем элементы внутри каждой группы по времени (новые сверху)
    Object.keys(groups).forEach(key => {
      groups[key].items.sort((a, b) => {
        const dateA = parseCustomDate(a.datatime);
        const dateB = parseCustomDate(b.datatime);
        return dateB - dateA; // Новые сверху
      });
    });
    
    // Сортируем группы по дате (новые сверху)
    const sortedGroups = {};
    Object.keys(groups)
      .sort((a, b) => {
        // Парсим даты для правильной сортировки
        const dateA = new Date(a.split('.').reverse().join('-')); // Преобразуем DD.MM.YYYY в YYYY-MM-DD
        const dateB = new Date(b.split('.').reverse().join('-'));
        return dateB - dateA; // Новые сверху
      })
      .forEach(key => {
        sortedGroups[key] = groups[key];
      });
    
    return sortedGroups;
  } catch (err) {
    return {};
  }
});

const getCurrencySymbol = (type) => {
  return type === "buy" ? "₽" : "USDT";
};

const getTransactionStatus = (boolSuccess) => {
  // Проверяем различные значения статуса
  switch (boolSuccess) {
    case "Error timer":
      return { text: t('error_timer'), class: 'error' };
    case "True":
    case 'success':
    case true:
      return { text: t('success'), class: 'success' };
    case "Error":
      return { text: t('transaction_error'), class: 'error' };
    case 'wait':
    case "wait_pay":
    case false:
      return { text: t('in_processing'), class: 'in_processing' };
    default:
      return { text: t('in_processing'), class: 'in_processing' };
  }
};

onMounted(async () => {
  await walletStore.getPrice();
});
</script>

<template>
  <div class="page-container">
    <header class="header">
      <h1>{{ t("history_tranc") }}</h1>
    </header>
    <div class="history-container">
      <div class="history">
        <template v-if="walletStore.history.length">
          <div
            v-for="(group, dateKey) in groupedHistory"
            :key="dateKey"
            class="history-group"
          >
            <h2 class="history-date">{{ group.displayDate }}</h2>
            <div
              v-for="(item, index) in group.items"
              :key="index"
              class="history-item"
              @click="walletStore.goTransaction(item)"
            >
              <div class="history-info">
                <div class="wrap-img">
                  <img
                    v-if="item.type_trans === 'referal'"
                    src="/assets/referal.svg"
                    alt="transaction-type"
                  />
                  <img
                    v-else-if="item.type_trans"
                    :src="`/assets/type-${item.type_trans}.svg`"
                    alt="transaction-type"
                  />
                  <img
                    v-else
                    :src="`/assets/type-buy.svg`"
                    alt="transaction-type"
                  />
                </div>
                <div class="history-more-info">
                  <span class="history-type" v-if="item.type_trans">{{ t(item.type_trans) }}</span>
                  <span class="history-type" v-else>{{ t('buy') }}</span>
                  <span 
                    :class="`history-status ${getTransactionStatus(item.bool_suecess).class}`"
                  >
                    {{ getTransactionStatus(item.bool_suecess).text }}
                  </span>
                </div>
              </div>
              <div class="history-count">
                <span class="count-usdt" v-if="!walletStore.hideBalanceActive">
                  {{
                    item.type_trans === "buy"
                      ? "-"
                      : item.type_trans === "output"
                      ? "-"
                      : "+"
                  }}
                  {{ walletStore.roundToHundredths(item.amount) }} USDT
                </span>
                <span class="count-usdt" v-else>********</span>
                <span class="count-rub" v-if="!walletStore.hideBalanceActive">
                  {{
                    item.type_trans === "buy"
                      ? "-"
                      : item.type_trans === "output"
                      ? "-"
                      : "+"
                  }}
                  {{ walletStore.roundToHundredths(walletStore.getRub(item.amount)) }} ₽
                </span>
                <span class="count-rub" v-else>********</span>
              </div>
            </div>
          </div>
        </template>

        <EmptyHistory v-else />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 20px 15px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-shrink: 0;
}

h1 {
  color: #141414;
}

.history-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history {
  flex: 1;
  width: 100%;
  border-radius: 25px 25px 0 0;
  color: black;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  max-height: 100%;
  padding-bottom: 100px;
  
  /* Скрываем скроллбар */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE и Edge */
}

/* Скрываем скроллбар для Webkit браузеров (Chrome, Safari) */
.history::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  background: transparent;
}

.history-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.history-date {
  font-size: 16px;
  font-weight: 300;
  text-align: left;
  color: #141414;
}

.history-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  padding: 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 500ms ease;
  flex-shrink: 0;
}

.history-item:hover {
  transform: translateY(-3px);
  box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
}

.history-info {
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

.history-more-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.history-type {
  text-align: left;
  font-weight: 400;
}

.history-status {
  text-align: left;
  font-size: 10px;
  font-weight: 400;
}

.history-count {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.count-usdt {
  font-weight: 400;
  font-size: 14px;
  text-align: end;
}

.count-rub {
  opacity: 0.4;
  font-size: 10px;
  text-align: end;
  font-weight: 300;
}

.error {
  color: #d62828;
}

.success {
  color: #4bab6b;
}

.in_processing {
  color: #d5a810;
}
</style>