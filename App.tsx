import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, PanResponder, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Game, LEVELS, OBJECTIVES, OBJECTIVE_LABELS, Point, distance, relativeAim } from './src/game';
import { Rink } from './src/rink';
import { emptyProgress, isUnlocked, parseProgress, recordRun, stars } from './src/progress';

const SAVE_KEY = 'bardown.progress.v1';
const starText = (count: number) => '★'.repeat(count) + '☆'.repeat(3 - count);
const powerNames = { fire: 'FIRE PUCK', curve: 'MEGA CURVE', freeze: 'FREEZE' };

function Callout({ text, eventId }: { text: string; eventId: number }) {
  const animation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    animation.setValue(0);
    const motion = Animated.timing(animation, { toValue: 1, duration: 1000, useNativeDriver: true });
    motion.start(); return () => motion.stop();
  }, [text, eventId, animation]);
  return <Animated.View pointerEvents="none" style={[s.callout, {
    opacity: animation.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] }),
    transform: [{ translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [15, -25] }) }, { scale: animation.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.75, 1.12, 1] }) }],
  }]}><Text style={s.calloutText}>{text}</Text></Animated.View>;
}

export default function App() {
  const game = useRef(new Game());
  const rink = useRef<Rink | null>(null);
  const frame = useRef(0);
  const mounted = useRef(true);
  const active = useRef(true);
  const screen = useRef<'levels' | 'game'>('levels');
  const progress = useRef(emptyProgress());
  const recorded = useRef<Game | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState('');
  const size = useRef({ width: 1, height: 1 });
  const stroke = useRef<Point[]>([]);
  const started = useRef(0);
  const anchor = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [, redraw] = useState(0);
  const lastUI = useRef('');
  const sync = () => {
    const g = game.current;
    if (g.phase === 'SUCCESS' && recorded.current !== g) {
      recorded.current = g;
      progress.current = recordRun(progress.current, g.levelIndex, g.objectives.map(o => o.complete));
      persist();
    }
    const key = `${g.levelIndex}|${g.phase}|${g.stage}|${g.message}|${g.intent.kind}|${g.preview.length > 0}|${g.preview.some(p => p.bounce)}|${g.eventId}|${Math.ceil(g.introRemaining)}|${g.cornerCovered(g.preview[g.preview.length - 1] ?? g.puck)}|${g.armed}|${g.terminalTime >= 1.1}|${screen.current}`;
    if (key !== lastUI.current && mounted.current) { lastUI.current = key; redraw(v => v + 1); }
  };

  function persist() {
    const data = JSON.stringify(progress.current);
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(SAVE_KEY, data))
      .then(() => { if (mounted.current) setSaveError(''); })
      .catch(() => { if (mounted.current) setSaveError('Progress is in memory, but could not be saved. Tap to retry saving.'); });
  }

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(SAVE_KEY).then(raw => { progress.current = parseProgress(raw); })
      .then(() => { if (mounted.current) setLoaded(true); })
      .catch(() => { if (mounted.current) setSaveError('Could not load your save. Close and reopen the app to retry.'); });
    const subscription = AppState.addEventListener('change', state => {
      active.current = state === 'active';
      stroke.current = []; game.current.cancel(); sync();
    });
    return () => { mounted.current = false; subscription.remove(); cancelAnimationFrame(frame.current); rink.current?.dispose(); rink.current = null; };
  }, []);

  function contextCreated(gl: ExpoWebGLRenderingContext) {
    if (!mounted.current) return;
    try {
      cancelAnimationFrame(frame.current);
      rink.current?.dispose();
      rink.current = new Rink(gl);
      rink.current.resize(size.current.width, size.current.height);
      rink.current.render(game.current);
      setReady(true); setError('');
      let previous = performance.now();
      const tick = (now: number) => {
        if (!mounted.current) return;
        const dt = Math.min((now - previous) / 1000, 0.05); previous = now;
        try {
          if (active.current && screen.current === 'game') { game.current.update(dt); rink.current?.render(game.current); sync(); }
          frame.current = requestAnimationFrame(tick);
        } catch (e) { setError(e instanceof Error ? e.message : String(e)); setReady(false); }
      };
      frame.current = requestAnimationFrame(tick);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setReady(false); }
  }

  const gesture = useMemo(() => {
    const add = (dx: number, dy: number) => {
      const screen = relativeAim(anchor.current, dx, dy);
      const point = rink.current?.aimPoint(screen.x, screen.y);
      if (!point || !stroke.current.length) return;
      if (Math.hypot(distance(stroke.current[stroke.current.length - 1], point), (stroke.current[stroke.current.length - 1].height ?? 0) - (point.height ?? 0)) > 0.12) {
        // Bound memory during very long doodles while retaining the whole curve.
        if (stroke.current.length >= 500) stroke.current = stroke.current.filter((_, i) => i % 2 === 0);
        stroke.current.push(point);
      }
      game.current.aim(stroke.current); sync();
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (event, state) => {
        return screen.current === 'game' && active.current && game.current.paused && !!rink.current && event.nativeEvent.touches.length === 1 && Math.hypot(state.dx, state.dy) > 5;
      },
      onPanResponderGrant: (_, state) => {
        anchor.current = rink.current!.screenPoint(game.current.puck);
        stroke.current = [{ ...game.current.puck }]; started.current = performance.now();
        add(state.dx, state.dy);
      },
      onPanResponderMove: (event, state) => {
        if (event.nativeEvent.touches.length > 1) { stroke.current = []; game.current.cancel(); sync(); return; }
        add(state.dx, state.dy);
      },
      onPanResponderRelease: (_, state) => {
        if (!stroke.current.length) return;
        add(state.dx, state.dy);
        game.current.release(stroke.current, (performance.now() - started.current) / 1000);
        stroke.current = []; sync();
      },
      onPanResponderTerminate: () => { stroke.current = []; game.current.cancel(); sync(); },
      onPanResponderTerminationRequest: () => true,
    });
  }, []);

  const selectLevel = (index: number) => {
    if (!loaded || !isUnlocked(progress.current, index)) return;
    stroke.current = []; game.current = new Game(index); game.current.startPreview(); screen.current = 'game'; sync();
  };
  const retry = () => selectLevel(game.current.levelIndex);
  const g = game.current;
  const aiming = g.preview.length > 1;
  const banking = g.preview.some(p => p.bounce);
  const label = g.introRemaining > 0 ? 'GET READY' : aiming ? g.intent.kind === 'pass' ? banking ? 'BANK PASS' : 'ASSISTED PASS' : g.intent.kind === 'shot' ? 'SHOT ON NET' : banking ? 'BANK · NO TARGET' : 'NO TARGET' : g.paused ? 'TIME FROZEN' : g.terminal ? 'PLAY COMPLETE' : 'LIVE PLAY';

  if (screen.current === 'levels') return <SafeAreaView style={s.root}>
    <StatusBar barStyle="light-content" />
    <ScrollView contentContainerStyle={s.menu}>
      <Text style={s.eyebrow}>TEN RUSHES. ONE HIGHLIGHT REEL.</Text>
      <Text style={s.menuTitle}>BARDOWN<Text style={s.hero}> HERO</Text></Text>
      <Text style={s.instruction}>Draw the play. Bend the rules. Light the lamp.</Text>
      <View style={s.progressRow}><Text style={s.goldText}>{Object.values(progress.current.runs).reduce((sum, run) => sum + stars(run), 0)} / 30 STARS</Text><Text style={s.eyebrow}>LOCAL PROGRESS</Text></View>
      {!!saveError && <Pressable onPress={() => { if (loaded) persist(); }}><Text style={s.errorText}>{saveError}</Text></Pressable>}
      {!loaded && <Text style={s.instruction}>{saveError ? 'Your saved progress has not been overwritten.' : 'Loading your progress…'}</Text>}
      {LEVELS.map((level, i) => {
        const unlocked = loaded && isUnlocked(progress.current, i);
        return <Pressable key={level.title} disabled={!unlocked} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${level.title}. ${unlocked ? `${stars(progress.current.runs[i])} stars` : 'Locked'}`} onPress={() => selectLevel(i)} style={[s.levelCard, !unlocked && s.locked]}>
          <View style={s.progressRow}><Text style={s.levelNumber}>{String(i + 1).padStart(2, '0')}</Text><Text style={s.stars}>{unlocked ? starText(stars(progress.current.runs[i])) : 'LOCKED'}</Text></View>
          <Text style={s.title}>{level.title}</Text>
          <Text style={s.instruction}>{unlocked ? OBJECTIVES[i].map(id => OBJECTIVE_LABELS[id]).join(' · ') : `Complete level ${i} to unlock`}</Text>
        </Pressable>;
      })}
      <Text style={s.hint}>BEST SINGLE RUN COUNTS · UNLIMITED RETRIES</Text>
    </ScrollView>
  </SafeAreaView>;

  return (
    <SafeAreaView style={s.root} {...gesture.panHandlers}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <Text style={s.brand}>BARDOWN<Text style={s.hero}> HERO</Text></Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Restart the play" onPress={retry} style={s.retry}><Text style={s.retryText}>↻ RETRY</Text></Pressable>
      </View>
      <View style={s.levels}>
        <Pressable accessibilityRole="button" onPress={() => { stroke.current = []; g.cancel(); screen.current = 'levels'; cancelAnimationFrame(frame.current); rink.current?.dispose(); rink.current = null; setReady(false); sync(); }} style={s.retry}><Text style={s.retryText}>‹ LEVELS</Text></Pressable>
        <Text style={s.eyebrow}>RUSH {g.levelIndex + 1} / 10</Text>
        <Text style={s.stars}>{starText(stars(progress.current.runs[g.levelIndex]))}</Text>
      </View>
      <View style={s.arena} onLayout={e => { stroke.current = []; game.current.cancel(); size.current = e.nativeEvent.layout; rink.current?.resize(size.current.width, size.current.height); sync(); }}>
        <GLView style={StyleSheet.absoluteFill} onContextCreate={contextCreated} msaaSamples={4} />
        <View style={StyleSheet.absoluteFill} accessibilityLabel="Hockey rink. Drag anywhere on the screen to draw a pass or shot from the puck." />
        <View pointerEvents="none" style={s.arenaTop}>
          <View style={[s.badge, g.paused && s.frozen]}><Text style={[s.badgeText, g.paused && s.darkText]}>{label}</Text></View>
          <Text style={s.scenario}>{g.level.title}</Text>
        </View>
        {!ready && !error && <View pointerEvents="none" style={s.center}><Text style={s.resultTitle}>FLOODING THE ICE…</Text></View>}
        {ready && !error && g.introRemaining > 0 && <ScrollView style={s.result} contentContainerStyle={s.resultContent}>
          <Text style={s.resultKicker}>YOUR OBJECTIVES</Text>
          <Text style={s.title}>{g.level.title}</Text>
          <Text accessibilityLiveRegion="polite" style={s.countdown}>{Math.ceil(g.introRemaining)}</Text>
          {g.objectives.map(o => <Text key={o.id} style={s.objectiveDone}>☆ {o.label}</Text>)}
          <Text style={s.resultBody}>Three stars. One run. Make it count.</Text>
        </ScrollView>}
        {!!error && <View style={s.result}><Text style={s.resultTitle}>RINK COULDN’T LOAD</Text><Text style={s.resultBody}>{error}</Text><Text style={s.resultBody}>Share this error for debugging. See the rink troubleshooting steps in launch.md.</Text></View>}
        {!!g.callout && (!g.terminal || g.terminalTime < 1.1) && <Callout text={g.callout} eventId={g.eventId} />}
        {g.terminal && g.terminalTime >= 1.1 && !error && <ScrollView style={s.result} contentContainerStyle={s.resultContent}>
          <Text style={s.resultKicker}>{g.phase === 'SUCCESS' ? 'TOP SHELF. NO APOLOGIES.' : 'ONE MORE RUSH.'}</Text>
          <Text style={[s.resultTitle, g.phase === 'SUCCESS' && s.goal]}>{g.phase === 'SUCCESS' ? 'LEVEL COMPLETE' : 'DENIED.'}</Text>
          <Text style={s.stars}>{starText(g.objectives.filter(o => o.complete).length)}</Text>
          {g.objectives.map(o => <Text key={o.id} style={o.complete ? s.objectiveDone : s.resultBody}>{o.complete ? '★' : '☆'} {o.label}</Text>)}
          <Text style={s.resultBody}>{g.phase === 'SUCCESS' ? 'Stars earned together in this run.' : g.message}</Text>
          {!!saveError && <Pressable onPress={persist}><Text style={s.errorText}>{saveError}</Text></Pressable>}
          <Pressable accessibilityRole="button" onPress={retry} style={s.playAgain}><Text style={s.playAgainText}>↻  RUN IT BACK</Text></Pressable>
          {g.phase === 'SUCCESS' && g.levelIndex < LEVELS.length - 1 && <Pressable accessibilityRole="button" onPress={() => selectLevel(g.levelIndex + 1)} style={s.playAgain}><Text style={s.playAgainText}>NEXT LEVEL →</Text></Pressable>}
          {g.phase === 'SUCCESS' && g.levelIndex === LEVELS.length - 1 && <Text style={s.objectiveDone}>ALL TEN RUSHES COMPLETE! Replay for 30 stars.</Text>}
        </ScrollView>}
        <View pointerEvents="none" style={s.legend}><Text style={s.teal}>● YOUR TEAM</Text><Text style={s.red}>● DEFENDERS</Text><Text style={s.goldText}>● GOALIE</Text></View>
      </View>
      <View style={s.footer}>
        {!!g.availablePowerup && <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!g.armed }} disabled={!!g.armed} onPress={() => { stroke.current = []; g.activatePowerup(); sync(); }} style={s.powerButton}><Text style={s.playAgainText}>{g.armed ? 'ARMED · ' : 'ACTIVATE · '}{powerNames[g.availablePowerup]} · NEXT ACTION</Text></Pressable>}
        <Text style={s.eyebrow}>{g.reboundUsed ? 'BONUS CHANCE / REBOUND' : `DECISION ${g.stage + 1} / ${g.level.moments.length}`}</Text>
        <Text style={s.title}>{g.reboundUsed ? 'CLEAN UP THE REBOUND' : g.moment.title}</Text>
        <Text style={s.instruction}>{aiming ? g.intent.kind === 'pass' ? 'Teammate locked. Release to send your curve.' : g.intent.kind === 'shot' ? g.cornerCovered(g.preview[g.preview.length - 1]) ? 'Covered right now. Bend late or change corners.' : 'A gap for now. Shoot quickly or bend it late.' : 'Finish near a teammate or toward the net.' : g.message}</Text>
        <Text style={s.hint}>{g.paused ? 'DRAG ANYWHERE · DRAW PAST BOARDS TO BANK · RELEASE' : 'TEAL ATTACKS ↑  •  NO LIMIT ON RETRIES'}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  countdown: { color: '#ffcf5a', fontSize: 56, fontWeight: '900', lineHeight: 64 },
  menu: { padding: 22, gap: 12, paddingBottom: 40 },
  menuTitle: { color: '#f2f8fa', fontSize: 34, fontWeight: '900', letterSpacing: -1.5, marginTop: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  levelCard: { backgroundColor: '#102a3c', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#28596a' },
  locked: { opacity: 0.5 },
  levelNumber: { color: '#23dcb6', fontSize: 24, fontWeight: '900' },
  stars: { color: '#ffcf5a', fontSize: 23, fontWeight: '900', letterSpacing: 3 },
  errorText: { color: '#ffaf9f', fontSize: 12, lineHeight: 18, padding: 8 },
  objectiveDone: { color: '#23dcb6', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  powerButton: { backgroundColor: '#ffcf5a', borderRadius: 8, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  callout: { position: 'absolute', top: '21%', left: 0, right: 0, alignItems: 'center' },
  calloutText: { fontSize: 27, fontWeight: '900', fontStyle: 'italic', color: '#ffcf5a', textShadowColor: '#071624', textShadowRadius: 4, textShadowOffset: { width: 2, height: 3 } },
  resultContent: { padding: 18, alignItems: 'center', gap: 10 },
  root: { flex: 1, backgroundColor: '#071624' },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#8ba6b6', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  brand: { color: '#f2f8fa', fontSize: 20, fontWeight: '900', letterSpacing: -1 },
  hero: { color: '#23dcb6' },
  retry: { paddingHorizontal: 10, minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#314a5b', borderRadius: 6 },
  retryText: { color: '#dcecf1', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  levels: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingBottom: 4 },
  levelButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#1b3547' },
  levelSelected: { backgroundColor: '#267463' },
  arena: { flex: 1, minHeight: 240, overflow: 'hidden' },
  arenaTop: { position: 'absolute', top: 7, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { backgroundColor: '#1b3547', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 4 },
  frozen: { backgroundColor: '#ffcf5a' },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: '#c4d9e2' },
  darkText: { color: '#10293c' },
  scenario: { color: '#708e9e', fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  result: { position: 'absolute', top: 48, bottom: 30, left: 16, right: 16, backgroundColor: '#0a2032f5', borderRadius: 14, borderWidth: 1, borderColor: '#3a596b' },
  resultKicker: { color: '#8ba6b6', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  resultTitle: { color: '#f6f9fb', fontSize: 29, fontWeight: '900', textAlign: 'center' },
  goal: { color: '#ffcf5a', fontSize: 26 },
  resultBody: { color: '#b9ccd6', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  playAgain: { backgroundColor: '#23dcb6', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 6, marginTop: 8 },
  playAgainText: { color: '#071624', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  legend: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 18 },
  teal: { color: '#23dcb6', fontSize: 8, fontWeight: '700' },
  red: { color: '#ef7387', fontSize: 8, fontWeight: '700' },
  goldText: { color: '#ffcf5a', fontSize: 8, fontWeight: '700' },
  footer: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderColor: '#203648' },
  title: { color: '#eff7f8', fontSize: 18, fontWeight: '900', letterSpacing: -0.5, marginTop: 3 },
  instruction: { color: '#bbced8', fontSize: 12, lineHeight: 17, marginTop: 4, minHeight: 34 },
  hint: { color: '#68909f', fontSize: 8, fontWeight: '800', letterSpacing: 0.6, marginTop: 5 },
});
