import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useFonts } from 'expo-font';
// Deep imports: pulling from the package root bundles every weight it ships.
import { Archivo_900Black } from '@expo-google-fonts/archivo/900Black';
import { Archivo_900Black_Italic } from '@expo-google-fonts/archivo/900Black_Italic';
import { BarlowCondensed_500Medium } from '@expo-google-fonts/barlow-condensed/500Medium';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono/400Regular';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono/700Bold';
import { audio } from './sound';
import { c, fonts, radii, t } from './theme';

export function feedback(kind: 'tap' | 'pass' | 'goal' | 'fail' | 'bank') {
  const effect = kind === 'goal' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : kind === 'fail' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    : kind === 'tap' ? Haptics.selectionAsync()
    : Haptics.impactAsync(kind === 'bank' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  void effect.catch(() => {}); // Unsupported devices should play normally.
}

/** Display type is three loaded families; nothing renders until they land. */
export function useGameFonts() {
  const [loaded] = useFonts({
    Archivo_900Black, Archivo_900Black_Italic,
    BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold,
    SpaceMono_400Regular, SpaceMono_700Bold,
  });
  return loaded;
}

const Motion = createContext(false);
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const event = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; event.remove(); };
  }, []);
  return <Motion.Provider value={reduced}>{children}</Motion.Provider>;
}
export const useReducedMotion = () => useContext(Motion);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Button({ children, onPress, style, label, disabled = false, quiet = false }: {
  children: React.ReactNode; onPress: (event: GestureResponderEvent) => void; style?: StyleProp<ViewStyle>; label?: string; disabled?: boolean; quiet?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current, reduced = useReducedMotion();
  const animate = (toValue: number) => { if (!reduced) Animated.spring(scale, { toValue, speed: 35, bounciness: 5, useNativeDriver: true }).start(); };
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPressIn={() => animate(0.96)} onPressOut={() => animate(1)} onPress={event => { if (!quiet) { audio.play('tap'); feedback('tap'); } onPress(event); }}
    style={[style, { transform: [{ scale }] }]}>{children}</AnimatedPressable>;
}

export function Rise({ children, style, delay = 0 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  const progress = useRef(new Animated.Value(0)).current, reduced = useReducedMotion();
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 300, delay: reduced ? 0 : delay, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [progress, reduced, delay]);
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : 18, 0] }) }] }]}>{children}</Animated.View>;
}

export function Quiet({ live, children, style }: { live: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(1)).current, reduced = useReducedMotion();
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: live ? 0.42 : 1, duration: reduced ? 0 : 220, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [live, opacity, reduced]);
  // box-none: the fading chrome must never intercept a swipe meant for the rink.
  return <Animated.View pointerEvents="box-none" style={[style, { opacity }]}>{children}</Animated.View>;
}

/** Vertical band backdrop. Stands in for venue art until it is commissioned. */
export function Band({ colors, style }: { colors: readonly [string, string, string]; style?: StyleProp<ViewStyle> }) {
  const id = React.useId();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
    <Svg width="100%" height="100%">
      <Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={colors[0]} /><Stop offset="0.45" stopColor={colors[1]} /><Stop offset="1" stopColor={colors[2]} />
      </LinearGradient></Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={'url(#' + id + ')'} />
    </Svg>
  </View>;
}

/** Soft radial wash: the gold pay-off glow and the locker spotlight. */
export function Glow({ color, opacity = 0.24, cx = '50%', cy = '46%', rx = '75%', ry = '40%', style }: {
  color: string; opacity?: number; cx?: string; cy?: string; rx?: string; ry?: string; style?: StyleProp<ViewStyle>;
}) {
  const id = React.useId();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
    <Svg width="100%" height="100%">
      <Defs><RadialGradient id={id} cx={cx} cy={cy} rx={rx} ry={ry}>
        <Stop offset="0" stopColor={color} stopOpacity={opacity} /><Stop offset="1" stopColor={color} stopOpacity="0" />
      </RadialGradient></Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={'url(#' + id + ')'} />
    </Svg>
  </View>;
}

/** The 2px dashed climb the whole map hangs off. */
export function DashLine({ height, color, width = 2 }: { height: number; color: string; width?: number }) {
  return <Svg width={width} height={height}>
    <Line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke={color} strokeWidth={width} strokeDasharray="5,7" />
  </Svg>;
}

/** Star ring around a map node: a gold arc of stars/3 over a dim track. */
export function StarRing({ size, stars, track = c.ringTrack, arc = c.gold, thickness = 5.5 }: {
  size: number; stars: number; track?: string; arc?: string; thickness?: number;
}) {
  const r = (size - thickness) / 2, circumference = 2 * Math.PI * r, swept = Math.max(0, Math.min(1, stars / 3));
  return <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
    <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={thickness} fill="none" />
    {swept > 0 && <Circle cx={size / 2} cy={size / 2} r={r} stroke={arc} strokeWidth={thickness} fill="none"
      strokeDasharray={String(circumference)} strokeDashoffset={circumference * (1 - swept)}
      transform={'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'} />}
  </Svg>;
}

/** Power arc for the HUD fire button. Sweeps 0 to 360 as the play charges. */
export function PowerArc({ size, progress, track = c.powerTrack, arc = c.gold, thickness = 5 }: {
  size: number; progress: number; track?: string; arc?: string; thickness?: number;
}) {
  const r = (size - thickness) / 2, circumference = 2 * Math.PI * r, swept = Math.max(0, Math.min(1, progress));
  return <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
    <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={thickness} fill="none" />
    {swept > 0 && <Circle cx={size / 2} cy={size / 2} r={r} stroke={arc} strokeWidth={thickness} fill="none" strokeLinecap="round"
      strokeDasharray={String(circumference)} strokeDashoffset={circumference * (1 - swept)}
      transform={'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'} />}
  </Svg>;
}

/** Hairline that fades out from a centred label: the venue banner rule. */
export function Rule({ color, flip = false }: { color: string; flip?: boolean }) {
  const id = React.useId();
  return <View style={s.rule}><Svg width="100%" height={1}>
    <Defs><LinearGradient id={id} x1={flip ? '1' : '0'} y1="0" x2={flip ? '0' : '1'} y2="0">
      <Stop offset="0" stopColor={color} stopOpacity="0" /><Stop offset="1" stopColor={color} stopOpacity="0.5" />
    </LinearGradient></Defs>
    <Rect x="0" y="0" width="100%" height="1" fill={'url(#' + id + ')'} />
  </Svg></View>;
}

/** Shakes on refusal: the sealed gate card when a locked node is tapped. */
export function useShake() {
  const offset = useRef(new Animated.Value(0)).current, reduced = useReducedMotion();
  const shake = () => {
    if (reduced) return;
    offset.setValue(0);
    Animated.sequence([-1, 1, -0.6, 0.6, 0].map(to =>
      Animated.timing(offset, { toValue: to, duration: 52, useNativeDriver: true }))).start();
  };
  return { shake, style: { transform: [{ translateX: offset.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] }) }] } };
}

const fill: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.ink },
  fill,
  center: { ...fill, alignItems: 'center', justifyContent: 'center' },
  scrim: { ...fill, backgroundColor: c.scrim },
  chromeSquare: { width: 34, height: 34, borderRadius: 11, backgroundColor: c.chrome, borderWidth: 1, borderColor: c.chromeBorder, alignItems: 'center', justifyContent: 'center' },
  chromeGlyph: { fontSize: 17, lineHeight: 20, color: c.locked, fontFamily: fonts.bodyStrong },
  chromePill: { height: 34, borderRadius: 17, paddingHorizontal: 13, backgroundColor: c.chromeSolid, borderWidth: 1, borderColor: c.glassBorder, flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: { ...t.eyebrow, color: c.teal },
  eyebrowGold: { ...t.eyebrow, color: c.gold },
  eyebrowQuiet: { ...t.eyebrow, color: c.ice600 },
  screenTitle: { ...t.screenTitle, color: c.ice100, marginTop: 2 },
  body: { ...t.body, color: c.ice400, lineHeight: 17 },
  label: { ...t.label, color: c.ice300 },
  numeral: { ...t.numeral, color: c.ice100 },
  rule: { flex: 1, height: 1 },
  primary: { height: 58, borderRadius: radii.pill, backgroundColor: c.teal, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  primaryText: { fontFamily: fonts.displayItalic, fontSize: 18, color: c.ink },
  secondary: { height: 46, borderRadius: 23, backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.6, color: c.ice300 },
  errorText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: '#FFAF9F', padding: 8, textAlign: 'center' },
  arena: { flex: 1, overflow: 'hidden', minHeight: 180 },
  arenaTouch: { ...fill },
});
