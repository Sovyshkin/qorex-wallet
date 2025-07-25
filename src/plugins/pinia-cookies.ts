import Cookies from 'js-cookie';

export function PiniaCookiesPlugin({ store }) {
  // Загрузка состояния из куков при инициализации хранилища
  const savedState = Cookies.get(store.$id);
  if (savedState) {
    store.$patch(JSON.parse(savedState));
  }

  // Автоматическое сохранение состояния при изменении
  store.$subscribe((mutation, state) => {
    Cookies.set(store.$id, JSON.stringify(state), { expires: 7 }); // expires - срок хранения (7 дней)
  });
}