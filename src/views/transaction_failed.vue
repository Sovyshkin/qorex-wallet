<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
<template>
    <div class="transaction-page">
        <header class="header">
      <img
        class="arrow"
        src="@/assets/arrow-left.svg"
        alt=""
        @click="$router.go(-1)"
      />
      <h1>{{ t('failed_payment') }}</h1>
      <div class="emp"></div>
    </header>
    <div class="container">
        <img src="@/assets/error.svg" alt="">
        <h2>{{ t('failed_payment') }}</h2>
        <p>{{t('failed_text')}}</p>
    </div>
    </div>
</template>
<style scoped>
.container {
    height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    font-size: 20px;
    font-weight: 600s;
    padding: 10px;
}

.header {
  padding: 20px 15px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

h1 {
  color: #141414;
}

.emp {
  width: 32px;
}

.arrow {
  cursor: pointer;
}

h2 {
    color: #1C1C1C;
    font-size: 20px;
    font-weight: 400;
}

p {
    color: #262626;
    opacity: 40%;
    font-size: 14px;
    font-weight: 300;
}
</style>