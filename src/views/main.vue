<script setup>
import { useWalletStore } from "@/stores/walletStore";
const walletStore = useWalletStore();
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
<template>
  <div class="wrapper">
    <header>
      <div class="user">
        <div class="wrap-avatar">
          <img :src="walletStore.user.photo_url" alt="" />
        </div>
        <span class="name">{{ walletStore.user.first_name }}</span>
      </div>
    </header>
    <main class="container">
      <div class="wrap-balance">
        <div class="balance">
          <div class="wrap-text">
            <span>{{ t("total_balance") }}</span>
            <img
              src="../assets/hide.png"
              v-if="walletStore.hideBalanceActive"
              alt="hide_balance"
            />
            <img src="../assets/open.png" v-else alt="open_balance" />
          </div>
          <h2 class="balance-rub">0.0 ₽</h2>
        </div>
        <div class="actions">
          <button class="btn">
            <div class="wrap-img">
              <img src="../assets/deposit.png" alt="deposit" />
            </div>
            <span>{{ t("deposit") }}</span>
          </button>
          <button class="btn">
            <div class="wrap-img">
              <img src="../assets/send.png" alt="send" />
            </div>
            <span>{{ t("send") }}</span>
          </button>
          <button class="btn">
            <div class="wrap-img">
              <img src="../assets/pay.png" alt="pay" />
            </div>
            <span>{{ t("pay") }}</span>
          </button>
        </div>
      </div>
      <div class="coins">
        <div class="coin">
          <div class="coin-info">
            <img
              src="data:image/svg+xml,<svg%20width='40'%20height='40'%20viewBox='0%200%2040%2040'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'><rect%20width='40'%20height='40'%20rx='20'%20fill='%232AAF86'/><path%20d='M22.0302%2021.7391V21.7365C21.9162%2021.7444%2021.3279%2021.7789%2020.0186%2021.7789C18.9716%2021.7789%2018.2375%2021.7497%2017.9777%2021.7365V21.7391C13.9518%2021.5616%2010.9488%2020.8618%2010.9488%2020.0217C10.9488%2019.1841%2013.9544%2018.4818%2017.9777%2018.3042V21.0421C18.2401%2021.0606%2018.9955%2021.1057%2020.0371%2021.1057C21.2881%2021.1057%2021.9136%2021.0527%2022.0302%2021.0421V18.3068C26.0482%2018.4871%2029.0432%2019.1868%2029.0432%2020.0243C29.0432%2020.8618%2026.0456%2021.5616%2022.0302%2021.7418M22.0302%2018.0233V15.5743H27.6358V11.8398H12.3748V15.5743H17.9804V18.0233C13.4243%2018.2326%2010%2019.1338%2010%2020.2151C10%2021.2965%2013.427%2022.1977%2017.9804%2022.4097V30.2602H22.0329V22.4097C26.581%2022.2003%2030%2021.2992%2030%2020.2178C30%2019.1391%2026.581%2018.2353%2022.0329%2018.0259'%20fill='white'/></svg>"
              alt=""
            />
            <div class="coin-currency">
                <span class="coin-name">USDT</span>
                <span class="currency-rate">75.95 ₽</span>
            </div>
          </div>
          <div class="coin-activity">
            <span class="coin-balance">0.0 ₽</span>
            <span class="coin-balance-name">0.0 USDT</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
<style scoped>
.wrapper {
  height: 90vh;
  background: linear-gradient(181deg, #007aff 0%, rgba(90, 185, 219, 1) 50%);
  color: #fff;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

header {
  padding: 15px 20px;
}

.user {
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.wrap-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wrap-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.name {
  font-weight: 600;
  font-size: 16px;
}

.container,
.wrap-balance {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.wrap-balance {
  height: fit-content;
}

.wrap-text {
  display: flex;
  align-items: center;
  gap: 7px;
}

.wrap-text img {
  height: 24px;
}

h2 {
  text-align: center;
  font-size: 34px;
  font-weight: 600;
}

.actions {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 25px;
}

.btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.25px;
}

.wrap-img {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 12px;
}

.wrap-img img {
  height: 24px;
}

.coins {
  height: 50vh;
  width: 100%;
  background-color: #fff;
  border-radius: 25px 25px 0 0;
  color: black;
  padding: 30px 20px;
}

.coin {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.coin-info {
    display: flex;
    align-items: center;
    gap: 15px;
}

.coin-currency, .coin-activity {
    display: flex;
    flex-direction: column;
}

.coin-name, .coin-balance {
    font-weight: 500;
}

.currency-rate, .coin-balance-name {
    color: #9c9da4;
    font-size: 14px;
    letter-spacing: .15px;
    line-height: 18px;
}

.coin-balance {
    text-align: end;
}
</style>
