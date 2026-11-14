import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Copy, useUi } from './ui';
import type { LocalDataNoticeState } from '../local-data-notice';
export function LocalDataNotice({ notice, onSave = false }: { notice: LocalDataNoticeState; onSave?: boolean }) {
  const { t } = useTranslation();
  const { styles } = useUi();
  if (notice.accepted || !notice.ready) return null;
  return <View style={styles.note}>
    <Copy>{t('localData.disclosure')}</Copy>
    {onSave ? <View accessible accessibilityRole="checkbox" accessibilityLabel={t('localData.accept')} accessibilityState={{ checked: false, disabled: true }}><Copy>☐ {t('localData.saveAcknowledgment')}</Copy></View> : <Pressable accessibilityRole="checkbox" accessibilityLabel={t('localData.accept')} accessibilityState={{ checked: false, disabled: notice.saving }} disabled={notice.saving} onPress={() => { void notice.accept(); }} style={{ minHeight: 44, justifyContent: 'center' }}><Copy>☐ {t('localData.accept')}</Copy></Pressable>}
    {notice.error && <><Copy accessibilityRole="alert" style={styles.error}>{t('localData.failed')}</Copy><Button title={t('localData.retry')} secondary busy={notice.saving} onPress={() => { void notice.accept(); }} /></>}
  </View>;
}
