import { Pressable, View } from 'react-native';
import { Copy, useUi } from './ui';
type Props = {
  month: string; monthLabel: string; weekdays: string[]; dates: string[]; selected: string;
  previousLabel: string; nextLabel: string; previousDisabled?: boolean; nextDisabled?: boolean;
  onPrevious: () => void; onNext: () => void; onSelect: (date: string) => void;
  label: (date: string) => string; recorded: (date: string) => boolean;
  hideGrid?: boolean; total?: (date: string) => string | undefined; disabled?: boolean; testPrefix?: string;
};
export function MonthCalendar(props: Props) {
  const { colors } = useUi();
  const leading = (new Date(`${props.month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const slots = [...Array<string | undefined>(leading).fill(undefined), ...props.dates];
  while (slots.length % 7) slots.push(undefined);
  return <View style={{ gap: 2 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 4 }}>
      {arrow('previous')}
      <Copy accessibilityRole="header" style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', paddingVertical: 6 }}>{props.monthLabel}</Copy>
      {arrow('next')}
    </View>
    {!props.hideGrid && <>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {props.weekdays.map((day, index) => <View key={index} style={{ flex: 1, minWidth: 0, paddingVertical: 6, paddingHorizontal: 1 }}><Copy style={{ fontSize: 10, textAlign: 'center', color: colors.muted }}>{day}</Copy></View>)}
    </View>
    {Array.from({ length: slots.length / 7 }, (_, week) => <View key={week} testID={props.testPrefix ? `${props.testPrefix}-week-${week}` : undefined} style={{ flexDirection: 'row', alignItems: 'stretch' }}>
      {slots.slice(week * 7, week * 7 + 7).map((date, index) => date ? <Pressable key={date} testID={props.testPrefix ? `${props.testPrefix}-${date}` : undefined} accessibilityRole="button" accessibilityLabel={props.label(date)} accessibilityState={{ selected: props.selected === date, disabled: props.disabled }} disabled={props.disabled} onPress={() => props.onSelect(date)} style={{ flex: 1, minWidth: 0, padding: 2 }}>
        <View style={{ flex: 1, minHeight: props.total ? 54 : 46, paddingVertical: 3, paddingHorizontal: 1, gap: 1, borderWidth: 1, borderRadius: 9, borderColor: props.selected === date ? colors.selectedBorder : colors.border, backgroundColor: props.selected === date ? colors.selected : colors.surface, justifyContent: 'center', alignItems: 'center' }}>
          <Copy style={{ fontSize: 14, lineHeight: 20, fontWeight: props.selected === date ? '700' : '500' }}>{date.slice(-2)}</Copy>
          {props.recorded(date) && <Copy style={{ fontSize: 8, lineHeight: 12, color: colors.primary }}>●{props.total ? ` ${props.total(date) ?? ''}` : ''}</Copy>}
        </View>
      </Pressable> : <View key={`blank-${index}`} style={{ flex: 1, minWidth: 0 }} />)}
    </View>)}
    </>}
  </View>;
  function arrow(direction: 'previous' | 'next') {
    const disabled = direction === 'previous' ? props.previousDisabled : props.nextDisabled;
    return <Pressable accessibilityRole="button" accessibilityLabel={direction === 'previous' ? props.previousLabel : props.nextLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={direction === 'previous' ? props.onPrevious : props.onNext} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.selected, opacity: disabled ? .45 : 1 }}><Copy style={{ fontSize: 24, lineHeight: 30 }}>{direction === 'previous' ? '‹' : '›'}</Copy></Pressable>;
  }
}
