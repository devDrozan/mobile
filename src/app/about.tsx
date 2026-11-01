import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AboutContent } from '../components/AboutContent';
import { Button, Screen } from '../components/ui';

export default function AboutScreen() {
  const { t } = useTranslation();
  return <Screen><AboutContent /><Button title={t('hub.backHome')} secondary onPress={() => router.navigate('/')} /></Screen>;
}
