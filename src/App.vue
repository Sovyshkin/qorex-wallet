<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from './components/NavBar.vue';
import AppLoader from './components/AppLoader.vue';
import AppMessage from './components/AppMessage.vue'
import { useWalletStore } from '@/stores/walletStore.ts'

const router = useRouter();
const isLoading = ref(false);
const walletStore = useWalletStore()

router.beforeEach((to, from, next) => {
  isLoading.value = true;
  
  if (to.meta.requiresPin && !walletStore.isPinVerified.value) {
    isLoading.value = false;
    return next({ name: 'EnterPin' });
  }
  
  if (to.name === 'CreatePin' && walletStore.hasPinCode()) {
    isLoading.value = false;
    return next({ name: 'EnterPin' });
  }

  // if (walletStore.codePasswordActive && !walletStore.isPinVerified && to.name !== 'pin-code') {
  //   isLoading.value = false;
  //   return next({ name: 'pin-code' });
  // }
  
  next();
  
  setTimeout(() => {
    isLoading.value = false;
  }, 500);
});

onMounted(() => {
  try {
    walletStore.getUserInfo()
  } catch (err) {
    console.log(err);
    
  }
})
</script>

<template>
  <main class="wrapper">
    <AppMessage/>
    <div class="wrap-load" v-if="isLoading">
      <AppLoader/>
    </div>
    <router-view v-else v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
  <footer>
    <NavBar />
  </footer>
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
}

.vue-devtools__panel {
  display: none !important;
}

h1 {
  text-align: center;
}
</style>