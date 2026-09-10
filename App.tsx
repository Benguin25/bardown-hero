import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, PanResponder, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Game, MOMENTS, Point, distance } from './src/game';
import { Rink } from './src/rink';

export default function App() {
  const game = useRef(new Game());
  const rink = useRef<Rink | null>(null);
  const frame = useRef(0);
  const mounted = useRef(true);
  const active = useRef(true);
  const size = useRef({ width: 1, height: 1 });
  const stroke = useRef<Point[]>([]);
  const started = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [, redraw] = useState(0);
  const lastUI = useRef('');
  const sync = () => {
    const g = game.current;
    const key = `${g.phase}|${g.stage}|${g.message}|${g.intent.kind}|${g.preview.length > 0}`;
    if (key !== lastUI.current && mounted.current) { lastUI.current = key; redraw(v => v + 1); }
  };

  useEffect(() => {
    mounted.current = true;
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
          if (active.current) { game.current.update(dt); rink.current?.render(game.current); sync(); }
          frame.current = requestAnimationFrame(tick);
        } catch (e) { setError(e instanceof Error ? e.message : String(e)); setReady(false); }
      };
      frame.current = requestAnimationFrame(tick);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setReady(false); }
  }

  const gesture = useMemo(() => {
    const add = (x: number, y: number) => {
      const point = rink.current?.icePoint(x, y);
      if (!point || !stroke.current.length) return;
      if (distance(stroke.current[stroke.current.length - 1], point) > 0.12) {
        // Bound memory during very long doodles while retaining the whole curve.
        if (stroke.current.length >= 500) stroke.current = stroke.current.filter((_, i) => i % 2 === 0);
        stroke.current.push(point);
      }
      game.current.aim(stroke.current); sync();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: event => {
        if (!game.current.paused || !rink.current || event.nativeEvent.touches.length !== 1) return false;
        const p = rink.current.screenPoint(game.current.puck);
        return Math.hypot(p.x - event.nativeEvent.locationX, p.y - event.nativeEvent.locationY) < 48;
      },
      onPanResponderGrant: () => { stroke.current = [{ ...game.current.puck }]; started.current = performance.now(); },
      onPanResponderMove: event => {
        if (event.nativeEvent.touches.length > 1) { stroke.current = []; game.current.cancel(); sync(); return; }
        add(event.nativeEvent.locationX, event.nativeEvent.locationY);
      },
      onPanResponderRelease: event => {
        add(event.nativeEvent.locationX, event.nativeEvent.locationY);
        game.current.release(stroke.current, (performance.now() - started.current) / 1000);
        stroke.current = []; sync();
      },
      onPanResponderTerminate: () => { stroke.current = []; game.current.cancel(); sync(); },
      onPanResponderTerminationRequest: () => true,
    });
  }, []);

  const retry = () => { stroke.current = []; game.current = new Game(); sync(); };
  const g = game.current;
  const aiming = g.preview.length > 1;
  const label = aiming ? g.intent.kind === 'pass' ? 'ASSISTED PASS' : g.intent.kind === 'shot' ? 'SHOT ON NET' : 'NO TARGET' : g.paused ? 'TIME FROZEN' : g.terminal ? 'PLAY COMPLETE' : 'LIVE PLAY';

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <View><Text style={s.eyebrow}>ONE RUSH. MAKE IT COUNT.</Text><Text style={s.brand}>BARDOWN<Text style={s.hero}> HERO</Text></Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Restart the play" onPress={retry} style={s.retry}><Text style={s.retryText}>↻ RETRY</Text></Pressable>
      </View>
      <View style={s.progress}>
        {['BREAKOUT', 'CURVE', 'FINISH'].map((name, i) => <View key={name} style={[s.step, i <= g.stage && s.stepOn]}><Text style={[s.stepText, i === g.stage && s.stepCurrent]}>{String(i + 1).padStart(2, '0')}  {name}</Text></View>)}
      </View>
      <View style={s.arena} onLayout={e => { size.current = e.nativeEvent.layout; rink.current?.resize(size.current.width, size.current.height); }}>
        <GLView style={StyleSheet.absoluteFill} onContextCreate={contextCreated} msaaSamples={4} />
        <View style={StyleSheet.absoluteFill} {...gesture.panHandlers} accessibilityLabel="Hockey rink. Drag from the gold puck ring to draw a pass or shot." />
        <View pointerEvents="none" style={s.arenaTop}>
          <View style={[s.badge, g.paused && s.frozen]}><Text style={[s.badgeText, g.paused && s.darkText]}>{label}</Text></View>
          <Text style={s.scenario}>THE OPENING RUSH</Text>
        </View>
        {!ready && !error && <View pointerEvents="none" style={s.center}><Text style={s.resultTitle}>FLOODING THE ICE…</Text></View>}
        {!!error && <View style={s.result}><Text style={s.resultTitle}>RINK COULDN’T LOAD</Text><Text style={s.resultBody}>{error}</Text><Text style={s.resultBody}>Share this error for debugging. See the rink troubleshooting steps in launch.md.</Text></View>}
        {g.terminal && !error && <View style={s.result}>
          <Text style={s.resultKicker}>{g.phase === 'SUCCESS' ? 'TOP SHELF. NO APOLOGIES.' : 'ONE MORE RUSH.'}</Text>
          <Text style={[s.resultTitle, g.phase === 'SUCCESS' && s.goal]}>{g.phase === 'SUCCESS' ? 'BAR DOWN!' : 'DENIED.'}</Text>
          <Text style={s.resultBody}>{g.phase === 'SUCCESS' ? 'Ridiculous curve. Beautiful finish.' : g.message}</Text>
          <Pressable accessibilityRole="button" onPress={retry} style={s.playAgain}><Text style={s.playAgainText}>↻  RUN IT BACK</Text></Pressable>
        </View>}
        <View pointerEvents="none" style={s.legend}><Text style={s.teal}>● YOUR TEAM</Text><Text style={s.red}>● DEFENDERS</Text><Text style={s.goldText}>● GOALIE</Text></View>
      </View>
      <View style={s.footer}>
        <Text style={s.eyebrow}>{g.reboundUsed ? 'BONUS CHANCE / REBOUND' : `DECISION ${g.stage + 1} / 3`}</Text>
        <Text style={s.title}>{g.reboundUsed ? 'CLEAN UP THE REBOUND' : MOMENTS[g.stage].title}</Text>
        <Text style={s.instruction}>{aiming ? g.intent.kind === 'pass' ? 'Teammate locked. Release to send your curve.' : g.intent.kind === 'shot' ? 'Placement matters. Release to rip it.' : 'Finish near a teammate or toward the net.' : g.message}</Text>
        <Text style={s.hint}>{g.paused ? 'HOLD PUCK  →  DRAW ANY CURVE  →  RELEASE' : 'TEAL ATTACKS ↑  •  NO LIMIT ON RETRIES'}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071624' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#8ba6b6', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  brand: { color: '#f2f8fa', fontSize: 23, fontWeight: '900', letterSpacing: -1, marginTop: 5 },
  hero: { color: '#23dcb6' },
  retry: { padding: 10, borderWidth: 1, borderColor: '#314a5b', borderRadius: 6 },
  retryText: { color: '#dcecf1', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 10 },
  step: { flex: 1, borderTopWidth: 2, borderColor: '#213a4b', paddingTop: 8 },
  stepOn: { borderColor: '#23dcb6' },
  stepText: { color: '#688795', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  stepCurrent: { color: '#e1f4f4' },
  arena: { flex: 1, minHeight: 240, overflow: 'hidden' },
  arenaTop: { position: 'absolute', top: 7, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { backgroundColor: '#1b3547', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 4 },
  frozen: { backgroundColor: '#ffcf5a' },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: '#c4d9e2' },
  darkText: { color: '#10293c' },
  scenario: { color: '#708e9e', fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  result: { position: 'absolute', top: '26%', left: 24, right: 24, backgroundColor: '#0a2032f5', padding: 24, borderRadius: 14, borderWidth: 1, borderColor: '#3a596b', alignItems: 'center', gap: 12 },
  resultKicker: { color: '#8ba6b6', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  resultTitle: { color: '#f6f9fb', fontSize: 29, fontWeight: '900', textAlign: 'center' },
  goal: { color: '#ffcf5a', fontSize: 38 },
  resultBody: { color: '#b9ccd6', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  playAgain: { backgroundColor: '#23dcb6', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 6, marginTop: 8 },
  playAgainText: { color: '#071624', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  legend: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 18 },
  teal: { color: '#23dcb6', fontSize: 8, fontWeight: '700' },
  red: { color: '#ef7387', fontSize: 8, fontWeight: '700' },
  goldText: { color: '#ffcf5a', fontSize: 8, fontWeight: '700' },
  footer: { paddingHorizontal: 22, paddingTop: 17, paddingBottom: 18, borderTopWidth: 1, borderColor: '#203648' },
  title: { color: '#eff7f8', fontSize: 23, fontWeight: '900', letterSpacing: -0.5, marginTop: 6 },
  instruction: { color: '#bbced8', fontSize: 13, lineHeight: 19, marginTop: 7, minHeight: 38 },
  hint: { color: '#68909f', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 12 },
});
