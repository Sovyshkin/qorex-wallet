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
  console.log('Парсим дату:', dateString, 'тип:', typeof dateString, 'длина:', dateString?.length);
  
  if (!dateString) {
    console.log('Дата не определена, возвращаем текущую дату');
    return new Date();
  }
  
  // Если это уже объект Date
  if (dateString instanceof Date) {
    console.log('Уже объект Date:', dateString);
    return dateString;
  }
  
  // Преобразуем в строку если это число
  const dateStr = String(dateString);
  
  // Проверяем формат YYYYMMDDHHMMSS (14 символов)
  if (dateStr.length === 14 && /^\d{14}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Месяцы от 0 до 11
    const day = parseInt(dateStr.substring(6, 8));
    const hours = parseInt(dateStr.substring(8, 10));
    const minutes = parseInt(dateStr.substring(10, 12));
    const seconds = parseInt(dateStr.substring(12, 14));
    
    console.log('Извлеченные значения (формат YYYYMMDDHHMMSS):', { year, month: month + 1, day, hours, minutes, seconds });
    
    const date = new Date(year, month, day, hours, minutes, seconds);
    console.log('Созданная дата:', date);
    
    return date;
  }
  
  // Проверяем формат YYYY-MM-DD HH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(dateStr)) {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      console.log('Дата в формате ISO распознана:', parsedDate);
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
      console.log('Дата из timestamp распознана:', date);
      return date;
    }
  }
  
  // Пробуем стандартное преобразование даты
  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    console.log('Дата распознана стандартным парсером:', parsedDate);
    return parsedDate;
  }
  
  console.log('Неверный формат даты, возвращаем текущую дату');
  return new Date(); // Возвращаем текущую дату если формат неверный
};

const getGroupKey = (dateString) => {
  const date = parseCustomDate(dateString);
  const key = date.toLocaleDateString("ru-RU");
  console.log(`getGroupKey: ${dateString} -> ${key}`);
  return key;
};

const formatDisplayDate = (dateString) => {
  const date = parseCustomDate(dateString);
  const formatted = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long"
  });
  console.log(`formatDisplayDate: ${dateString} -> ${formatted}`);
  return formatted;
};

const groupedHistory = computed(() => {
  try {
    console.log('=== ГРУППИРОВКА ИСТОРИИ ===');
    console.log('История транзакций:', walletStore.history);
    
    const groups = {};

    walletStore.history.forEach((item, index) => {
      console.log(`Обрабатываем транзакцию ${index}:`, item);
      
      const dateKey = getGroupKey(item.datatime); // Уникальный ключ для группировки
      const displayDate = formatDisplayDate(item.datatime); // Отображаемая дата

      console.log(`Ключ даты: ${dateKey}, Отображаемая дата: ${displayDate}`);

      if (!groups[dateKey]) {
        groups[dateKey] = {
          displayDate: displayDate, // Сохраняем отображаемую дату
          items: []
        };
      }
      groups[dateKey].items.push(item);
    });
    
    console.log('Группы после обработки:', groups);
    
    // Сортируем группы по дате (новые сверху)
    const sortedGroups = {};
    Object.keys(groups)
      .sort((a, b) => {
        // Парсим даты для правильной сортировки
        const dateA = new Date(a.split('.').reverse().join('-')); // Преобразуем DD.MM.YYYY в YYYY-MM-DD
        const dateB = new Date(b.split('.').reverse().join('-'));
        console.log(`Сравниваем даты: ${a} (${dateA}) vs ${b} (${dateB})`);
        return dateB - dateA; // Новые сверху
      })
      .forEach(key => {
        sortedGroups[key] = groups[key];
      });
    
    console.log('Отсортированные группы:', sortedGroups);
    console.log('=========================');
    
    return sortedGroups;
  } catch (err) {
    console.log('Ошибка при группировке истории:', err);
    return {};
  }
});

const getCurrencySymbol = (type) => {
  return type === "buy" ? "₽" : "USDT";
};

onMounted(async () => {
  console.log('=== ИСТОРИЯ КОМПОНЕНТ ЗАГРУЖЕН ===');
  console.log('Текущая история в store:', walletStore.history);
  console.log('Длина истории:', walletStore.history?.length);
  
  await walletStore.getPrice();
  
  console.log('После получения цены, история:', walletStore.history);
  console.log('===================================');
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
                    v-if="item.type_trans"
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
                  <span v-if="item.bool_suecess" class="history-status success">{{
                    t("success")
                  }}</span>
                  <span v-else class="history-status in_processing">{{
                    t("in_processing")
                  }}</span>
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