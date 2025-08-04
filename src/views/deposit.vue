<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
<template>
    <header class="header">
    <img
      class="arrow"
      src="../assets/arrow-left.svg"
      alt=""
      @click="walletStore.goBack()"
    />
    <h1>{{ t("deposit_page") }}</h1>
    <div class="emp"></div>
  </header>
</template> 
<style scoped>
.header {
    padding: 20px 15px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.emp {
    width: 32px;
}

h1 {
    color: #141414;
}
</style>