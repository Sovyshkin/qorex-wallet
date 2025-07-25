<script setup>
import { useWalletStore } from '@/stores/walletStore'
const walletStore = useWalletStore()
</script>
<template>
    <div class="container">
        <header>
            <h1>Главная</h1>
            {{ walletStore.user }}
        </header>
    </div>
</template>
<style scoped>
body {
}
</style>