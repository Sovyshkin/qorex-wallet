<script setup>
import AppLoader from '@/components/AppLoader.vue'
</script>
<template>
    <div class="container">
        <AppLoader/>
        В разработке...
    </div>
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
}
</style>