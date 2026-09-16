import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { audio } from './sound';
import { CHAPTERS, CHAPTER_LEVEL_COUNTS, HIGHLIGHTS, LEVELS, OBJECTIVE_LABELS } from './content';
import { isUnlocked, stars, type Progress } from './progress';

export function feedback(kind: 'tap' | 'pass' | 'goal' | 'fail' | 'bank') {
  const effect = kind === 'goal' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : kind === 'fail' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    : kind === 'tap' ? Haptics.selectionAsync()
    : Haptics.impactAsync(kind === 'bank' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  void effect.catch(() => {}); // Unsupported devices should play normally.
}

const Motion = createContext(false);
const CHAPTER_ACCENTS = ['#23dcb6', '#ffcf5a', '#77b9ff', '#c78cff', '#ff7f6e', '#a8f05a'] as const;
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
export function Button({ children, onPress, style, label, disabled = false }: {
  children: React.ReactNode; onPress: () => void; style?: StyleProp<ViewStyle>; label?: string; disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current, reduced = useReducedMotion();
  const animate = (toValue: number) => { if (!reduced) Animated.spring(scale, { toValue, speed: 35, bounciness: 5, useNativeDriver: true }).start(); };
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPressIn={() => animate(0.96)} onPressOut={() => animate(1)} onPress={() => { audio.play('tap'); feedback('tap'); onPress(); }}
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
export function Quiet({ live, children }: { live: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current, reduced = useReducedMotion();
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: live ? 0.42 : 1, duration: reduced ? 0 : 220, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [live, opacity, reduced]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}
function Star({ earned, index, animate }: { earned: boolean; index: number; animate: boolean }) {
  const reduced = useReducedMotion(), scale = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(reduced || !animate ? 0 : index * 130),
      Animated.spring(scale, { toValue: 1, speed: 18, bounciness: reduced ? 0 : 12, useNativeDriver: true }),
    ]);
    if (reduced) scale.setValue(1); else animation.start();
    return () => animation.stop();
  }, [scale, index, animate, reduced]);
  return <Animated.Text style={[s.star, !earned && s.starEmpty, animate && s.bigStar, { transform: [{ scale }] }]}>{earned ? '★' : '☆'}</Animated.Text>;
}
export function Stars({ count, animate = false }: { count: number; animate?: boolean }) {
  return <View accessible accessibilityLabel={`${count} of 3 stars`} style={s.starRow}>{[0, 1, 2].map(i => <Star key={i} earned={i < count} index={i} animate={animate} />)}</View>;
}

export function Campaign({ progress, loaded, error, save, select, soundOn, toggleSound }: {
  progress: Progress; loaded: boolean; error: string; save: () => void; select: (index: number) => void; soundOn: boolean; toggleSound: () => void;
}) {
  const total = Object.values(progress.runs).reduce((sum, run) => sum + stars(run), 0);
  const current = LEVELS.findIndex((_, i) => isUnlocked(progress, i) && !progress.runs[i]?.[0]);
  const next = current < 0 ? 0 : current;
  return <ScrollView contentContainerStyle={s.campaign} showsVerticalScrollIndicator={false}>
    <Rise>
      <View style={s.campaignTop}><Text style={s.brand}>BARDOWN<Text style={s.teal}> HERO</Text></Text><Button style={s.soundButton} label={`Sound ${soundOn ? 'on' : 'off'}`} onPress={toggleSound}><Text style={s.soundText}>SND {soundOn ? 'ON' : 'OFF'}</Text></Button></View>
      <View style={s.campaignHeading}><Text style={s.campaignTitle}>MAKE THE{ '\n' }HIGHLIGHT.</Text><View style={s.scoreBadge}><Text style={s.scoreStar}>★</Text><Text style={s.score}>{total}<Text style={s.scoreOf}> / {LEVELS.length * 3}</Text></Text></View></View>
      <View style={s.meter}><View style={[s.meterFill, { width: `${total / (LEVELS.length * 3) * 100}%` }]} /></View>
      <Text style={s.tagline}>{current < 0 ? 'Campaign cleared. Chase the perfect reel.' : 'One puck. Big plays. No apologies.'}</Text>
      {loaded && <Button style={s.continueButton} onPress={() => select(next)} label={`Play ${LEVELS[next].title}`}><View><Text style={s.continueKicker}>{current < 0 ? 'RUN IT BACK' : current === 0 ? 'HIT THE ICE' : 'KEEP IT GOING'}</Text><Text style={s.continueName}>{LEVELS[next].title}</Text></View><Text style={s.playArrow}>▶</Text></Button>}
      {!!error && <Button onPress={save}><Text style={s.errorText}>{error}</Text></Button>}
      {!loaded && <Text style={s.body}>{error ? 'Your saved progress is safe.' : 'Getting your skates ready…'}</Text>}
    </Rise>
    {CHAPTERS.map((chapter, chapterIndex) => {
      const chapterStart = CHAPTER_LEVEL_COUNTS.slice(0, chapterIndex).reduce((sum, count) => sum + count, 0);
      const chapterCount = CHAPTER_LEVEL_COUNTS[chapterIndex];
      const chapterLevels = LEVELS.slice(chapterStart, chapterStart + chapterCount);
      return <Rise key={chapter} delay={80 + chapterIndex * 45}>
      <View style={[s.chapterHeading, { borderLeftColor: CHAPTER_ACCENTS[chapterIndex] }]}><Text style={[s.chapterNumber, { color: CHAPTER_ACCENTS[chapterIndex] }]}>0{chapterIndex + 1}</Text><Text style={s.chapterName}>{chapter}</Text><Text style={s.chapterScore}>{chapterLevels.reduce((sum, _, offset) => sum + stars(progress.runs[chapterStart + offset]), 0)} / {chapterCount * 3} ★</Text></View>
      {chapterLevels.map((level, offset) => {
        const i = chapterStart + offset, unlocked = loaded && isUnlocked(progress, i), complete = !!progress.runs[i]?.[0], now = loaded && i === current;
        return <Button key={level.title} disabled={!unlocked} onPress={() => select(i)} label={`${i + 1}. ${level.title}. ${now ? 'Up next.' : complete ? 'Completed.' : unlocked ? '' : 'Locked.'} ${stars(progress.runs[i])} stars.`}
          style={[s.card, { borderLeftColor: CHAPTER_ACCENTS[chapterIndex], borderLeftWidth: 3 }, complete && s.cardComplete, now && s.cardCurrent, !unlocked && s.cardLocked]}>
          <View style={[s.numberTile, complete && s.numberComplete, now && s.numberCurrent]}><Text style={[s.levelNumber, now && s.ink]}>{String(i + 1).padStart(2, '0')}</Text><Text style={[s.tileMark, now && s.ink]}>{complete ? '✓' : now ? '▶' : '—'}</Text></View>
          <View style={s.cardCopy}><View style={s.cardHeading}><Text style={s.cardState}>{now ? 'UP NEXT' : complete ? 'CLEARED' : 'LOCKED'}</Text><Stars count={stars(progress.runs[i])} /></View>
            <Text style={[s.cardName, !unlocked && s.muted]}>{level.title}</Text>
            <Text style={s.highlight}>{HIGHLIGHTS[i]}</Text>
            <Text style={s.cardObjectives}>{level.objectives.map(id => OBJECTIVE_LABELS[id]).join(' · ')}</Text>
          </View>
        </Button>;
      })}
    </Rise>;})}
    <Text style={s.campaignFoot}>Every rush is another shot at three stars.</Text>
  </ScrollView>;
}

const fill: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071624' },
  teal: { color: '#23dcb6' }, ink: { color: '#071624' }, muted: { color: '#8199a8' },
  campaign: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32, gap: 16 }, campaignTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#eff8fa', fontSize: 23, fontWeight: '900', letterSpacing: -0.8 },
  campaignHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  campaignTitle: { color: '#eff8fa', fontSize: 35, lineHeight: 35, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1.3 },
  scoreBadge: { alignItems: 'center', paddingLeft: 10 }, scoreStar: { color: '#ffcf5a', fontSize: 31 },
  score: { color: '#ffcf5a', fontSize: 22, fontWeight: '900' }, scoreOf: { color: '#91aaba', fontSize: 14 },
  meter: { height: 5, borderRadius: 3, backgroundColor: '#21394c', overflow: 'hidden', marginTop: 18 }, meterFill: { height: 5, backgroundColor: '#ffcf5a' },
  tagline: { color: '#a6becc', fontSize: 13, marginTop: 9, marginBottom: 16 },
  continueButton: { backgroundColor: '#23dcb6', borderRadius: 14, minHeight: 68, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  continueKicker: { color: '#124b45', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 }, continueName: { color: '#071624', fontSize: 16, fontWeight: '900', marginTop: 3 }, playArrow: { color: '#071624', fontSize: 25 },
  chapterHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, borderLeftWidth: 3, paddingLeft: 9 }, chapterNumber: { color: '#23dcb6', fontSize: 13, fontWeight: '900' }, chapterName: { color: '#e5f2f5', flex: 1, fontSize: 13, fontWeight: '900', letterSpacing: 1 }, chapterScore: { color: '#b7c7ce', fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 13, backgroundColor: '#11283a', borderWidth: 1, borderColor: '#294354', padding: 12, marginBottom: 8, flexDirection: 'row', gap: 12 },
  cardCurrent: { borderColor: '#ffcf5a', backgroundColor: '#213537', borderWidth: 2 }, cardComplete: { borderColor: '#235b55', backgroundColor: '#102d32' }, cardLocked: { backgroundColor: '#0d2030', borderColor: '#1e3343' },
  numberTile: { width: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1c3446' }, numberComplete: { backgroundColor: '#174d45' }, numberCurrent: { backgroundColor: '#ffcf5a' }, levelNumber: { fontSize: 21, fontWeight: '900', color: '#c1d5dd' }, tileMark: { color: '#23dcb6', fontSize: 14, marginTop: 4 },
  cardCopy: { flex: 1 }, cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardState: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: '#9fb7c4' }, cardName: { fontSize: 16, fontWeight: '900', color: '#f0f6f8', marginTop: 2 }, highlight: { color: '#bfd0d7', fontSize: 12, lineHeight: 16, marginTop: 3 }, cardObjectives: { color: '#8daab8', fontSize: 11, lineHeight: 15, marginTop: 6 },
  starRow: { flexDirection: 'row', gap: 3, alignItems: 'center' }, star: { color: '#ffcf5a', fontSize: 20 }, starEmpty: { color: '#67818f' }, bigStar: { fontSize: 54, marginHorizontal: 4 },
  campaignFoot: { color: '#89a4b2', textAlign: 'center', fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 3, minHeight: 54 },
  navButton: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#142b3d' }, navGlyph: { fontSize: 27, color: '#dcf2f5', fontWeight: '700' }, headerCopy: { flex: 1 }, levelTitle: { color: '#ecf7f9', fontWeight: '900', fontSize: 14 }, soundButton: { minWidth: 62, height: 32, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#142b3d' }, soundText: { color: '#b9d7df', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  playProgress: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }, dot: { width: 16, height: 3, borderRadius: 2, backgroundColor: '#365161' }, dotDone: { backgroundColor: '#23dcb6' }, dotCurrent: { backgroundColor: '#ffcf5a' }, levelIndex: { fontSize: 11, color: '#94aebc', marginLeft: 5 },
  arena: { flex: 1, overflow: 'hidden', minHeight: 180 }, arenaTouch: { ...fill },
  // Reserve both instruction lines: swapping the idle copy for aiming copy
  // must not resize the rink and cancel the gesture that triggered the swap.
  bottom: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 6 }, promptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, promptCopy: { flex: 1 }, promptTitle: { color: '#f1f8fa', fontWeight: '900', fontSize: 16 }, promptBody: { color: '#a5c0cb', fontSize: 12, lineHeight: 16, minHeight: 32, marginTop: 3 }, objectiveButton: { minWidth: 52, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#152e3e' }, objectiveGlyph: { color: '#ffcf5a', fontSize: 18, fontWeight: '900' },
  powerButton: { minHeight: 44, backgroundColor: '#ffcf5a', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, powerText: { color: '#071624', fontWeight: '900', fontSize: 13 },
  overlay: { ...fill, justifyContent: 'center', paddingHorizontal: 22, backgroundColor: '#07162438' },
  intro: { backgroundColor: '#092536ed', borderRadius: 20, borderWidth: 1, borderColor: '#35616b', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }, countdown: { color: '#ffcf5a', fontSize: 64, fontWeight: '900', fontStyle: 'italic', minWidth: 46 }, introCopy: { flex: 1 }, kicker: { color: '#23dcb6', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 }, introObjective: { color: '#e0eff3', fontSize: 12, lineHeight: 20 },
  resultScroll: { flexGrow: 0, maxHeight: '92%', borderRadius: 24, backgroundColor: '#092334f5', borderWidth: 1, borderColor: '#38616b' }, resultContent: { padding: 22, alignItems: 'center', gap: 10 }, resultTitle: { color: '#ffcf5a', fontSize: 36, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1, textAlign: 'center' }, failTitle: { color: '#ff8997' }, body: { color: '#afc7d2', fontSize: 13, lineHeight: 19, textAlign: 'center' }, objectiveRow: { alignSelf: 'stretch', flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 5 }, objectiveMark: { fontSize: 21, color: '#23dcb6' }, objectiveText: { flex: 1, color: '#d0e3e9', fontSize: 13 },
  primary: { minHeight: 50, alignSelf: 'stretch', borderRadius: 13, backgroundColor: '#23dcb6', alignItems: 'center', justifyContent: 'center', marginTop: 6 }, primaryText: { color: '#071624', fontSize: 15, fontWeight: '900' }, secondary: { minHeight: 44, alignSelf: 'stretch', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a384a' }, secondaryText: { color: '#d8ebf0', fontSize: 13, fontWeight: '800' },
  objectivesSheet: { position: 'absolute', bottom: 12, left: 18, right: 18, backgroundColor: '#092536f5', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#365461' },
  center: { ...fill, alignItems: 'center', justifyContent: 'center' }, errorText: { color: '#ffaf9f', fontSize: 12, lineHeight: 18, padding: 8 },
  callout: { position: 'absolute', top: '28%', left: 18, right: 18, alignItems: 'center' }, calloutPlate: { maxWidth: '94%', paddingHorizontal: 18, paddingVertical: 8, backgroundColor: '#071624df', borderColor: '#ffcf5a', borderWidth: 1, borderRadius: 10, transform: [{ skewX: '-5deg' }] }, calloutText: { fontSize: 31, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.7, color: '#ffcf5a', textShadowColor: '#071624', textShadowRadius: 5, textShadowOffset: { width: 2, height: 3 } },
});
