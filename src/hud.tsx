import React, { useEffect, useRef } from 'react';
import { Animated, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Game } from './game';
import type { Objective, Powerup } from './content';
import { OBJECTIVE_SHORT } from './content';
import { Button, Glow, PowerArc, Rise, feedback, s, useReducedMotion } from './ui';
import { c, fonts, radii, shadow, t } from './theme';

const POWER_NAMES: Record<Powerup, string> = { fire: 'FIRE PUCK', curve: 'MEGA CURVE', freeze: 'FREEZE' };

/** The measured value beside a cleared objective on the result panel. */
export function objectiveValue(game: Game, id: Objective): string {
  switch (id) {
    case 'goal': return game.shotStyle === 'oneTimer' ? 'ONE-T' : game.shotStyle.toUpperCase();
    case 'top': return game.goalHeight >= 3.8 ? 'BAR' : game.goalHeight >= 3 ? 'SHELF' : `${game.goalHeight.toFixed(1)}m`;
    case 'curve': return `${game.curvedActions}×`;
    case 'passes': return `${game.passes} ${game.passes === 1 ? 'PASS' : 'PASSES'}`;
    case 'rebound': return game.reboundUsed ? 'REBOUND' : '—';
    case 'fire': return game.actionPower === 'fire' ? 'FIRE' : '—';
    case 'freeze': return `${game.frozenActions}×`;
    case 'bank': return `${game.bankPasses} BANK`;
    case 'lead': return `${game.leadPasses} LEAD`;
    default: return '';
  }
}

/** Top chrome: back, level name with three objective dots, restart. */
export function HudChrome({ title, index, count, objectives, justEarned, onBack, onRestart }: {
  title: string; index: number; count: number; objectives: boolean[]; justEarned: number; onBack: () => void; onRestart: () => void;
}) {
  return <SafeAreaView style={h.chromeSafe} pointerEvents="box-none"><View style={h.chrome} pointerEvents="box-none">
    <Button style={s.chromeSquare} label="Back to the map" onPress={onBack}><Text style={s.chromeGlyph}>‹</Text></Button>
    <View style={h.chromeBar}>
      <Text numberOfLines={1} style={h.chromeTitle}>{title}</Text>
      <View style={h.chromeTail}>
        {objectives.length > 0
          ? objectives.map((done, i) => <Text key={i} style={[h.dot, done && h.dotDone, done && i === justEarned && h.dotFresh]}>●</Text>)
          : <Text style={h.chromeIndex}>{String(index + 1).padStart(2, '0')}/{count}</Text>}
      </View>
    </View>
    <Button style={s.chromeSquare} label="Restart the level" onPress={onRestart}><Text style={[s.chromeGlyph, h.restartGlyph]}>↻</Text></Button>
  </View></SafeAreaView>;
}

/** Countdown over the live rink: 3 → 2 → 1, objectives staggering in. */
export function IntroCountdown({ seconds, objectives }: { seconds: number; objectives: readonly { id: string; label: string }[] }) {
  const pop = useRef(new Animated.Value(1)).current, reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    pop.setValue(1.3);
    const animation = Animated.timing(pop, { toValue: 1, duration: 260, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [seconds, pop, reduced]);
  return <View style={s.fill} pointerEvents="none">
    <View style={s.scrim} />
    <View style={h.countWrap}>
      <Animated.Text accessibilityLiveRegion="polite" style={[h.countNumber, { transform: [{ scale: pop }] }]}>{seconds}</Animated.Text>
      <Text style={h.countLabel}>MAKE IT COUNT</Text>
    </View>
    <View style={h.introList}>
      {objectives.map((objective, i) => <Rise key={objective.id} delay={i * 60} style={h.introRow}>
        <View style={h.introStar}><Text style={h.introStarGlyph}>★</Text></View>
        <Text numberOfLines={2} style={h.introText}>{objective.label.toUpperCase()}</Text>
      </Rise>)}
    </View>
    <Text style={h.introHint}>DRAG ANYWHERE TO DRAW YOUR PLAY</Text>
  </View>;
}

/** Skewed gold plate. Pops in, holds, fades. */
export function CalloutPlate({ text, eventId }: { text: string; eventId: number }) {
  const animation = useRef(new Animated.Value(0)).current, reduced = useReducedMotion();
  useEffect(() => {
    animation.setValue(0);
    const motion = Animated.timing(animation, { toValue: 1, duration: 1000, useNativeDriver: true });
    motion.start(); return () => motion.stop();
  }, [text, eventId, animation]);
  return <Animated.View pointerEvents="none" style={[h.callout, {
    opacity: animation.interpolate({ inputRange: [0, 0.18, 0.72, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: reduced ? [0, 0] : [14, -18] }) },
      { scale: animation.interpolate({ inputRange: [0, 0.18, 1], outputRange: reduced ? [1, 1, 1] : [0.7, 1.08, 1] }) },
    ],
  }]}>
    <View style={h.calloutPlate}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={h.calloutText}>{text}</Text>
    </View>
  </Animated.View>;
}

/** Bottom stack: the aim readout and the power ring around the fire button. */
export function PlayControls({ eyebrow, value, power, powerup, armed, onActivate }: {
  eyebrow: string; value: string; power: number; powerup?: Powerup; armed: Powerup | null;
  onActivate: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current, reduced = useReducedMotion();
  const ready = !!powerup && !armed;
  const maxed = power >= 0.995;
  const emphasized = ready || maxed;
  useEffect(() => {
    if (reduced || !emphasized) { pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 620, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 620, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [emphasized, pulse, reduced]);
  const arc = armed ? 1 : power;
  const percent = Math.round((armed ? 1 : power) * 100);
  return <SafeAreaView style={h.controlsSafe} pointerEvents="box-none"><View style={h.controls} pointerEvents="box-none">
    <View style={h.aimPill}>
      <Text style={h.aimEyebrow}>{eyebrow}</Text>
      <Text numberOfLines={1} style={h.aimValue}>{value}</Text>
    </View>
    <Button style={h.ring} disabled={!ready} label={powerup ? `Charge ${POWER_NAMES[powerup]}` : maxed ? 'Maximum power' : `Shot power ${percent}%`} onPress={onActivate}>
      <PowerArc size={88} progress={arc} arc={armed || ready || maxed ? c.gold : c.teal} />
      <Animated.View style={[h.ringDisc, !ready && !armed && !maxed && h.ringDiscQuiet,
        { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]}>
        <Text style={[h.ringGlyph, !ready && !armed && !maxed && h.ringGlyphQuiet]}>⚡</Text>
        <Text style={[h.ringValue, !ready && !armed && !maxed && h.ringValueQuiet]}>
          {armed ? 'CHARGED' : ready ? 'TAP' : maxed ? 'MAX' : `${percent}%`}
        </Text>
      </Animated.View>
    </Button>
  </View></SafeAreaView>;
}

function ResultStar({ earned, index, animate }: { earned: boolean; index: number; animate: boolean }) {
  const scale = useRef(new Animated.Value(animate ? 0 : 1)).current, reduced = useReducedMotion();
  useEffect(() => {
    if (!animate || reduced) { scale.setValue(1); return; }
    scale.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(index * 140),
      Animated.spring(scale, { toValue: 1, speed: 15, bounciness: 14, useNativeDriver: true }),
    ]);
    const tick = earned ? setTimeout(() => feedback('bank'), index * 140) : undefined;
    animation.start();
    return () => { animation.stop(); if (tick) clearTimeout(tick); };
  }, [scale, index, animate, earned, reduced]);
  return <Animated.View style={[h.resultStar, !earned && h.resultStarEmpty, { transform: [{ scale }] }]}>
    <Text style={[h.resultStarGlyph, !earned && h.resultStarGlyphEmpty]}>★</Text>
  </Animated.View>;
}

export type ResultObjective = { id: string; label: string; complete: boolean; value: string };

/** Glass result panel over a dimmed rink. */
export function ResultPanel({ victory, verdict, eyebrow, objectives, message, best, onPrimary, onRetry, onBack, primaryLabel, saveError, onSave }: {
  victory: boolean; verdict: string; eyebrow: string; objectives: readonly ResultObjective[]; message: string; best: string;
  onPrimary: () => void; onRetry: () => void; onBack: () => void; primaryLabel: string;
  saveError: string; onSave: () => void;
}) {
  const earned = objectives.filter(objective => objective.complete).length;
  return <View style={s.fill}>
    <View style={s.scrim} />
    <Glow color={victory ? c.gold : '#FF8997'} opacity={0.16} cy="34%" />
    <SafeAreaView style={h.resultSafe}>
    <ScrollView style={h.resultPage} contentContainerStyle={h.resultPageBody} showsVerticalScrollIndicator={false}>
      <Rise style={h.resultPanel}>
        <Text style={h.resultEyebrow}>{eyebrow}</Text>
        <Text style={[h.resultVerdict, !victory && h.resultVerdictFail]}>{verdict}</Text>
        <View style={h.resultStars}>
          {[0, 1, 2].map(i => <ResultStar key={i} earned={i < earned} index={i} animate={victory} />)}
        </View>
        <View style={h.resultDivider} />
        <View style={h.resultRows}>
          {objectives.map(objective => <View key={objective.id} style={h.resultRow}>
            <Text style={[h.resultDot, !objective.complete && h.resultDotOff]}>●</Text>
            <Text numberOfLines={1} style={[h.resultLabel, !objective.complete && h.resultLabelOff]}>{objective.label.toUpperCase()}</Text>
            <Text style={h.resultValue}>{objective.complete ? objective.value : OBJECTIVE_SHORT[objective.id as Objective] ?? '—'}</Text>
          </View>)}
        </View>
        <Text style={h.resultMessage}>{message}</Text>
        <Text style={h.resultBest}>{best}</Text>
      </Rise>
      {!!saveError && <Button style={h.resultError} onPress={onSave}><Text style={s.errorText}>{saveError}</Text></Button>}
      <View style={h.resultActions}>
        <Button style={s.primary} label={primaryLabel} onPress={onPrimary}>
          <Text style={s.primaryText}>{primaryLabel}</Text>
        </Button>
        {victory && earned < 3 && <Button style={s.secondary} label="Chase three stars" onPress={onRetry}>
          <Text style={s.secondaryText}>CHASE THREE STARS ↻</Text>
        </Button>}
        <Button style={s.secondary} label="Back to the map" onPress={onBack}>
          <Text style={s.secondaryText}>BACK TO THE MAP</Text>
        </Button>
      </View>
    </ScrollView>
    </SafeAreaView>
  </View>;
}

const h = StyleSheet.create({
  chromeSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  chrome: { marginTop: 10, marginHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  chromeBar: { flex: 1, height: 34, borderRadius: 17, paddingHorizontal: 13, backgroundColor: c.chrome, borderWidth: 1, borderColor: c.chromeBorder, flexDirection: 'row', alignItems: 'center', gap: 9 },
  chromeTitle: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.5, color: c.chromeText, flexShrink: 1 },
  chromeTail: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  chromeIndex: { fontFamily: fonts.numeralLight, fontSize: 10, color: c.ice600 },
  dot: { fontSize: 9, color: c.ice700 },
  dotDone: { color: c.teal },
  dotFresh: { color: c.gold },
  restartGlyph: { fontSize: 15 },

  countWrap: { position: 'absolute', left: 0, right: 0, top: '30%', alignItems: 'center' },
  countNumber: { ...t.countdown, color: c.gold, textShadowColor: 'rgba(255,197,49,0.34)', textShadowRadius: 30, textShadowOffset: { width: 0, height: 10 } },
  countLabel: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 4, color: c.teal, marginTop: 6 },
  introList: { position: 'absolute', left: 24, right: 24, bottom: 120, gap: 9 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 14, backgroundColor: c.chrome, borderWidth: 1, borderColor: c.glassBorder },
  introStar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: 'rgba(255,197,49,0.5)', alignItems: 'center', justifyContent: 'center' },
  introStarGlyph: { color: c.gold, fontSize: 13 },
  introText: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 13, letterSpacing: 1.2, color: c.ice200 },
  introHint: { position: 'absolute', left: 0, right: 0, bottom: 56, textAlign: 'center', fontFamily: fonts.body, fontSize: 13, letterSpacing: 1.4, color: c.lockedDim },

  callout: { position: 'absolute', top: '27%', left: 12, right: 12, alignItems: 'center' },
  calloutPlate: { maxWidth: '96%', paddingVertical: 6, paddingHorizontal: 22, backgroundColor: c.gold, transform: [{ skewX: '-8deg' }], ...shadow.plate },
  calloutText: { ...t.callout, color: c.ink, transform: [{ skewX: '8deg' }] },

  controlsSafe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  controls: { paddingBottom: 8, alignItems: 'center', gap: 8 },
  aimPill: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '86%', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, backgroundColor: 'rgba(6,21,32,0.66)', borderWidth: 1, borderColor: c.glassBorder },
  aimEyebrow: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 2, color: c.teal },
  aimValue: { fontFamily: fonts.displayItalic, fontSize: 15, letterSpacing: -0.4, color: c.ice100, flexShrink: 1 },
  ring: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  ringDisc: { position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderRadius: 34, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center', ...shadow.gold },
  ringDiscQuiet: { backgroundColor: 'rgba(6,21,32,0.7)', borderWidth: 1, borderColor: c.glassBorder, shadowOpacity: 0, elevation: 0 },
  ringGlyph: { fontSize: 20, lineHeight: 23 },
  ringGlyphQuiet: { opacity: 0.4 },
  ringValue: { fontFamily: fonts.numeral, fontSize: 11, color: c.ink, marginTop: 3 },
  ringValueQuiet: { color: c.ice400 },

  resultSafe: { flex: 1 },
  resultPage: { flex: 1 },
  resultPageBody: { flexGrow: 1, justifyContent: 'center', paddingTop: 28, paddingHorizontal: 16, paddingBottom: 12 },
  resultPanel: { borderRadius: radii.modal + 2, backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorderStrong, paddingVertical: 18, paddingHorizontal: 18, alignItems: 'center' },
  resultEyebrow: { ...t.eyebrow, color: c.teal, letterSpacing: 3.2, textAlign: 'center' },
  resultVerdict: { ...t.displayXL, color: c.ice100, marginTop: 12, textAlign: 'center' },
  resultVerdictFail: { color: '#FF8997' },
  resultStars: { flexDirection: 'row', gap: 10, marginTop: 20 },
  resultStar: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  resultStarEmpty: { backgroundColor: c.meterTrack },
  resultStarGlyph: { fontSize: 20, lineHeight: 24, color: c.ink },
  resultStarGlyphEmpty: { color: c.ice700 },
  resultDivider: { alignSelf: 'stretch', height: 1, backgroundColor: c.glassBorder, marginTop: 22, marginBottom: 16 },
  resultRows: { alignSelf: 'stretch', gap: 10 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultDot: { fontSize: 12, color: c.teal },
  resultDotOff: { color: c.ice700 },
  resultLabel: { flex: 1, fontFamily: fonts.labelSoft, fontSize: 12, letterSpacing: 0.7, color: c.chromeText },
  resultLabelOff: { color: c.ice500 },
  resultValue: { fontFamily: fonts.numeralLight, fontSize: 10, color: '#6F93A6' },
  resultMessage: { ...t.body, color: c.ice400, marginTop: 16, textAlign: 'center' },
  resultBest: { fontFamily: fonts.numeralLight, fontSize: 10, color: c.ice600, marginTop: 6 },
  resultError: { marginTop: 10 },
  resultActions: { marginTop: 10, paddingTop: 8, gap: 8 },
});
