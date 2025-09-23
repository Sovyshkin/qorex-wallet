<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from './components/NavBar.vue';
import AppLoader from './components/AppLoader.vue';
import AppMessage from './components/AppMessage.vue'
import { useWalletStore } from '@/stores/walletStore.ts'

const router = useRouter();
const walletStore = useWalletStore()

// Функция для проверки необходимости ввода PIN
const requirePin = () => {
  const pinVerified = localStorage.getItem('pinVerified')
  const hasPinCode = localStorage.getItem('hasPinCode') === 'true' || walletStore.hasPinCode()
  
  // Если PIN-код установлен и не был верифицирован в течение сессии
  if (hasPinCode && !pinVerified) {
    return true
  }
  
  // Проверяем, не истекло ли время сессии (например, 30 минут)
  if (pinVerified) {
    const verificationTime = parseInt(pinVerified)
    const currentTime = Date.now()
    const sessionTimeout = 30 * 60 * 1000 // 30 минут
    
    if (currentTime - verificationTime > sessionTimeout) {
      localStorage.removeItem('pinVerified')
      return true
    }
  }
  
  return false
}

// Список маршрутов, которые не требуют PIN-кода
const publicRoutes = ['EnterPin', 'CreatePin'];

router.beforeEach(async (to, from, next) => {
  walletStore.isLoading = true;
  
  try {
    // Если пользователь еще не загружен, загружаем его данные
    if (!walletStore.user.tg_id) {
      await walletStore.getUserInfo();
      if (walletStore.userTg.value.id) {
        await walletStore.getUser();
      }
    }

    // Проверяем, является ли маршрут публичным
    const isPublicRoute = publicRoutes.includes(to.name);
    
    // Если маршрут не публичный и требуется ввод PIN-кода
    if (!isPublicRoute && requirePin()) {
      // Если у пользователя еще нет PIN-кода, перенаправляем на создание
      if (!walletStore.hasPinCode()) {
        walletStore.isLoading = false;
        return next({ name: 'CreatePin' });
      } else {
        // Если PIN-код есть, но не верифицирован - перенаправляем на ввод
        walletStore.isLoading = false;
        return next({ 
          name: 'EnterPin', 
          query: { returnTo: to.fullPath } 
        });
      }
    }

    // Блокируем доступ к созданию PIN-кода если он уже установлен
    if (to.name === 'CreatePin' && walletStore.hasPinCode() && !requirePin()) {
      walletStore.isLoading = false;
      return next({ name: 'Home' }); // или на главную страницу
    }

    next();
  } catch (error) {
    console.error('Navigation error:', error);
    next();
  } finally {
    setTimeout(() => {
      walletStore.isLoading = false;
    }, 500);
  }
});

// Функция для инициализации приложения
const initializeApp = async () => {
  try {
    walletStore.getUserInfo();
    
    // Если это Telegram Web App, создаем/получаем пользователя
    if (window.Telegram && window.Telegram.WebApp) {
      if (walletStore.userTg.value.id) {
        await walletStore.getUser();
        
        // Проверяем наличие PIN-кода при загрузке приложения
        if (walletStore.hasPinCode() && requirePin()) {
          // Если требуется PIN, перенаправляем на страницу ввода
          router.push({ 
            name: 'EnterPin', 
            query: { returnTo: router.currentRoute.value.fullPath } 
          });
        }
      }
    }
  } catch (err) {
    console.error('App initialization error:', err);
  }
}

onMounted(() => {
  initializeApp();
});

// Компьютед свойство для отображения контента (исключая страницы PIN-кода)
const showContent = computed(() => {
  const currentRoute = router.currentRoute.value;
  return !publicRoutes.includes(currentRoute.name);
});
</script>

<template>
  <main class="wrapper">
    <AppMessage/>
    <div class="wrap-load" v-if="walletStore.isLoading">
      <AppLoader/>
    </div>
    <template v-else>
      <!-- Отображаем страницы PIN-кода без навбара -->
      <template v-if="!showContent">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </template>
      
      <!-- Отображаем основной контент с навбаром -->
      <template v-else>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
        <footer>
          <NavBar />
        </footer>
      </template>
    </template>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Geologica:wght@100..900&display=swap');
#app {
  font-family: "Geologica", sans-serif;
  width: 100%;
  background-color: #fff;
}
* {
  padding: 0px;
  margin: 0px;
  border: none;
  font-family: "Geologica", sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: 0;
  color: #1C1C1C;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body,
#app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

/* Links */

a,
a:link,
a:visited {
  text-decoration: none;
}

a:hover {
  text-decoration: none;
}

/* Common */

aside,
nav,
footer,
header,
section,
main {
  display: block;
}

ul,
ul li {
  list-style: none;
}

img {
  vertical-align: top;
}

img,
svg {
  max-width: 100%;
  height: auto;
}

/* Form */

input,
textarea,
button,
select {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  background-color: transparent;
}

input::-ms-clear {
  display: none;
}

button,
input[type="submit"] {
  display: inline-block;
  box-shadow: none;
  background-color: transparent;
  background: none;
  cursor: pointer;
}

input:focus,
input:active,
button:focus,
button:active {
  outline: none;
  box-shadow: none;
}

button::-moz-focus-inner {
  padding: 0;
  border: 0;
}

.wrap-load {
  height: 90vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
}

.vue-devtools__panel {
  display: none !important;
}

h1 {
  text-align: center;
}

/* Стили для страниц PIN-кода */
.pin-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>