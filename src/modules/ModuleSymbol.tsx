import { View } from 'react-native';

// Hand-built monochrome marks. The bundled Noto Sans Myanmar has no glyphs for
// the characters these tiles used to show, so every tile was drawn by an OS
// fallback face (or an emoji font for emoji-capable codepoints). Drawing the
// shapes keeps weight, size and baseline identical on both platforms.
export function ModuleSymbol({ id, color, size = 24 }: { id: string; color: string; size?: number }) {
  const ratio = size / 24;
  const px = (value: number) => Math.round(value * ratio * 100) / 100;
  const stroke = { borderColor: color, borderWidth: Math.max(1.5, px(2)) };
  const solid = (width: number, height: number, left: number, top: number, radius = 1) => ({ position: 'absolute' as const, width: px(width), height: px(height), left: px(left), top: px(top), borderRadius: px(radius), backgroundColor: color });
  const handle = (width: number, height: number, left: number, top: number, border: 'top' | 'bottom', facing: 'left' | 'right') => ({
    position: 'absolute' as const, width: px(width), height: px(height), left: px(left), top: px(top),
    borderColor: color, borderWidth: Math.max(1.5, px(2)),
    borderBottomWidth: border === 'bottom' ? Math.max(1.5, px(2)) : 0,
    borderTopWidth: border === 'top' ? Math.max(1.5, px(2)) : 0,
    borderLeftWidth: facing === 'left' ? Math.max(1.5, px(2)) : 0,
    borderRightWidth: facing === 'right' ? Math.max(1.5, px(2)) : 0,
    transform: [{ rotate: '45deg' }],
  });
  return <View accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    {id === 'severance' && <>
      {/* Banknote with a coin. */}
      <View style={[stroke, { position: 'absolute', left: 0, top: px(4), width: size, height: px(16), borderRadius: px(3) }]} />
      <View style={[stroke, { position: 'absolute', left: px(8.5), top: px(8.5), width: px(7), height: px(7), borderRadius: px(3.5) }]} />
    </>}
    {id === 'work' && <>
      {/* Clock. */}
      <View style={[stroke, { position: 'absolute', left: px(1), top: px(1), width: px(22), height: px(22), borderRadius: px(11) }]} />
      <View style={solid(2, 7, 11, 5.5, 1)} />
      <View style={solid(6, 2, 12, 11, 1)} />
    </>}
    {id === 'insurance' && <>
      {/* Medical cross. */}
      <View style={solid(6, 20, 9, 2, 1.5)} />
      <View style={solid(20, 6, 2, 9, 1.5)} />
    </>}
    {id === 'exchange' && <>
      {/* Two opposing arrows. */}
      <View style={solid(15, 2.4, 3, 6.3)} />
      <View style={handle(5.5, 5.5, 15, 4.6, 'top', 'right')} />
      <View style={solid(15, 2.4, 6, 15.3)} />
      <View style={handle(5.5, 5.5, 3.4, 13.6, 'bottom', 'left')} />
    </>}
    {id === 'finance' && <>
      {/* Growing bars. */}
      <View style={solid(4, 9, 2, 13, 1)} />
      <View style={solid(4, 14, 10, 8, 1)} />
      <View style={solid(4, 19, 18, 3, 1)} />
    </>}
    {id === 'information' && <>
      {/* Information mark. */}
      <View style={[stroke, { position: 'absolute', left: px(1), top: px(1), width: px(22), height: px(22), borderRadius: px(11) }]} />
      <View style={solid(2.6, 2.6, 10.7, 6.2, 1.3)} />
      <View style={solid(2.6, 8, 10.7, 10.6, 1.3)} />
    </>}
  </View>;
}
