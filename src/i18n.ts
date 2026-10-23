import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import my from './locales/my.json';
const i18n = createInstance();
void i18n.use(initReactI18next).init({ resources: { en: { translation: en }, my: { translation: my } }, lng: 'en', fallbackLng: 'en', interpolation: { escapeValue: false } });
export async function restoreLanguage() {
  try { if (await AsyncStorage.getItem('e9-language') === 'my') await i18n.changeLanguage('my'); } catch { /* Storage is optional. */ }
}
export async function changeLanguage(language: 'en' | 'my') {
  await i18n.changeLanguage(language);
  try { await AsyncStorage.setItem('e9-language', language); } catch { /* Calculations do not depend on storage. */ }
}
export default i18n;
