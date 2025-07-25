<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useWalletStore } from "../stores/walletStore.ts";
import InputCheck from "@/components/ui/inputs/InputCheck.vue";

const { t } = useI18n();
const walletStore = useWalletStore();

</script>
<template>
    <main class="container">
        <h1>{{ t('history_tranc') }}</h1>
        <p>{{ t('history_text') }}</p>
        <button class="btn">
            <img src="../assets/add.png" alt="">
            <span>{{ t('deposit_wallet') }}</span>
        </button>
    </main>
</template>
<style scoped>
.container {
    height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    font-size: 20px;
    font-weight: 600s;
    max-width: 300px;
    width: 100%;
    margin: 0 auto;
}

h1 {
    font-size: 24px;
    font-weight: 600;
    text-align: center;
}

p {
    text-align: center;
    font-size: 16px;
    color: rgb(36, 35, 35);
}

.btn {
    width: 100%;
    background-color: #007aff;
    padding: 15px 0;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.btn span {
    color: #fff;
    font-size: 16px;
    font-weight: 600;
}

.btn img {
    height: 20px;
}
</style>