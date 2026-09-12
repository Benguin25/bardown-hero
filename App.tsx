import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, PanResponder, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Game, LEVELS, Point, distance, relativeAim } from './src/game';
import { Rink } from './src/rink';
import { Button, Campaign, MotionProvider, Quiet, Rise, Stars, feedback, s, useReducedMotion } from './src/ui';
import { emptyProgress, isUnlocked, parseProgress, recordRun, stars } from './src/progress';
import { LESSONS, lessonComplete, tutorialGame } from './src/tutorial';

const SAVE_KEY = 'bardown.progress.v1';
const TUTORIAL_KEY = 'bardown.tutorial.v1';
const starText = (count: number) => '★'.repeat(count) + '☆'.repeat(3 - count);
const powerNames = { fire: 'FIRE PUCK', curve: 'MEGA CURVE', freeze: 'FREEZE' };

function Callout({ text, eventId }: { text: string; eventId: number }) {
  const animation = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    animation.setValue(0);
    const motion = Animated.timing(animation, { toValue: 1, duration: 1000, useNativeDriver: true });
    motion.start(); return () => motion.stop();
  }, [text, eventId, animation]);
  return <Animated.View pointerEvents="none" style={[s.callout, {
    opacity: animation.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] }),
    transform: [{ translateY: animation.interpolate({ inputRange: [0, 1], outputRange: reduced ? [0, 0] : [15, -25] }) }, { scale: animation.interpolate({ inputRange: [0, 0.15, 1], outputRange: reduced ? [1, 1, 1] : [0.75, 1.12, 1] }) }],
  }]}><Text style={s.calloutText}>{text}</Text></Animated.View>;
}

function GameApp() {
  const game = useRef(new Game());
  const rink = useRef<Rink | null>(null);
  const frame = useRef(0);
  const mounted = useRef(true);
  const active = useRef(true);
  const screen = useRef<'levels' | 'game'>('levels');
  const tutorial = useRef<number | null>(null);
  const chased = useRef(false);
  const [showHelp, setShowHelp] = useState(false);
  const progress = useRef(emptyProgress());
  const recorded = useRef<Game | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showObjectives, setShowObjectives] = useState(false);
  const lastFeedback = useRef<{ game: Game | null; event: number }>({ game: null, event: -1 });
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
    if (g.loosePuck) chased.current = true;
    if (tutorial.current === null && g.phase === 'SUCCESS' && recorded.current !== g) {
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
    AsyncStorage.getItem(TUTORIAL_KEY).then(value => { if (mounted.current && !value) setShowHelp(true); }).catch(() => {});
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
    if (!mounted.current || screen.current !== 'game') return;
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
        if (tutorial.current !== null && game.current.passes > 0) return false;
        return screen.current === 'game' && active.current && game.current.paused && !!rink.current && event.nativeEvent.touches.length === 1 && Math.hypot(state.dx, state.dy) > 5;
      },
      onPanResponderGrant: (_, state) => {
        setShowObjectives(false);
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
    tutorial.current = null;
    setShowObjectives(false); stroke.current = []; game.current = new Game(index); game.current.startPreview(); screen.current = 'game'; sync();
  };
  const startLesson = (lesson: number) => {
    tutorial.current = lesson; chased.current = false; setShowHelp(false); setShowObjectives(false);
    stroke.current = []; game.current = tutorialGame(lesson); screen.current = 'game';
    lastUI.current = ''; sync();
  };
  const retry = () => tutorial.current === null ? selectLevel(game.current.levelIndex) : startLesson(tutorial.current);
  const dismissHelp = () => { setShowHelp(false); void AsyncStorage.setItem(TUTORIAL_KEY, 'seen').catch(() => {}); };
  const back = () => {
    tutorial.current = null;
    stroke.current = []; game.current.cancel(); screen.current = 'levels';
    cancelAnimationFrame(frame.current); rink.current?.dispose(); rink.current = null;
    setShowObjectives(false); setReady(false); sync();
  };
  const g = game.current, aiming = g.preview.length > 1, banking = g.preview.some(p => p.bounce);
  const lesson = tutorial.current;
  const practiced = lesson !== null && lessonComplete(g, lesson, chased.current);
  const live = !g.paused && !g.terminal && g.introRemaining <= 0;
  const prompt = g.introRemaining > 0 ? 'Your next highlight starts here'
    : g.terminal ? g.phase === 'SUCCESS' ? 'That belongs on the reel.' : 'You’ve got the next one.'
    : aiming ? banking ? 'Off the boards' : g.intent.kind === 'shot' ? 'Pick your corner' : 'Put it into space'
    : g.reboundUsed ? 'Bury the rebound' : g.moment.title;
  const hint = g.introRemaining > 0 ? 'Three stars. One run.'
    : g.terminal ? '' : aiming ? banking ? 'Release and let the wing chase the bounce.'
    : g.intent.kind === 'shot' ? g.cornerCovered(g.preview[g.preview.length - 1]) ? 'Glove is there. Try the other corner.' : 'There’s the gap. Let it rip.'
    : 'Lead your teammate. Release to send it.' : g.paused ? g.message : ' ';
  const count = g.objectives.filter(o => o.complete).length;
  const victory = g.phase === 'SUCCESS';

  if (screen.current === 'levels') return <SafeAreaView style={s.root}>
    <StatusBar barStyle="light-content" />
    <Campaign progress={progress.current} loaded={loaded} error={saveError} save={() => { if (loaded) persist(); }} select={selectLevel} />
    <Button style={s.secondary} onPress={() => setShowHelp(true)}><Text style={s.secondaryText}>HOW TO PLAY</Text></Button>
    {showHelp && <View style={[StyleSheet.absoluteFill, s.overlay]}><ScrollView style={s.resultScroll} contentContainerStyle={s.resultContent}>
      <Text style={s.kicker}>WELCOME TO BARDOWN HERO</Text><Text style={s.resultTitle}>MAKE YOUR PLAY</Text>
      <Text style={s.body}>Drag anywhere to draw from the puck. Lift to play. Time freezes while you aim.</Text>
      <Text style={s.body}>Teal is your team. Red defenders race for passes and loose pucks. Lead a teammate into space or curve around pressure. A red pickup ends the rush.</Text>
      <Text style={s.body}>Shoot inside the posts. Gold corners show gaps; the goalie can still react. Bank off boards to find a new lane.</Text>
      <Text style={s.body}>Tap a yellow powerup before drawing when one is available. Goals unlock levels. Earn all three stars together in one run.</Text>
      <Button style={s.primary} onPress={() => { dismissHelp(); startLesson(0); }}><Text style={s.primaryText}>TRY THE GUIDED TUTORIAL</Text></Button>
      <Button style={s.secondary} onPress={dismissHelp}><Text style={s.secondaryText}>BACK TO CAMPAIGN</Text></Button>
    </ScrollView></View>}
  </SafeAreaView>;

  return <SafeAreaView style={s.root} {...gesture.panHandlers}>
    <StatusBar barStyle="light-content" />
    <View style={s.header}>
      <Button style={s.navButton} label="Back to campaign" onPress={back}><Text style={s.navGlyph}>‹</Text></Button>
      <View style={s.headerCopy}>
        <Text numberOfLines={1} style={s.levelTitle}>{lesson === null ? g.level.title : `PRACTICE ${lesson + 1} / ${LESSONS.length}`}</Text>
        {lesson === null && <View accessibilityLabel={`Play ${g.stage + 1} of ${g.level.moments.length}`} style={s.playProgress}>
          {g.level.moments.map((_, i) => <View key={i} style={[s.dot, i < g.stage && s.dotDone, i === g.stage && s.dotCurrent]} />)}
          <Text style={s.levelIndex}>{g.levelIndex + 1} / {LEVELS.length}</Text>
        </View>}
      </View>
      <Button style={s.navButton} label="Retry level" onPress={retry}><Text style={s.navGlyph}>↻</Text></Button>
    </View>
    <View style={s.arena} onLayout={e => {
      const { width, height } = e.nativeEvent.layout;
      // Native layout notifications can repeat during HUD updates. Only a real
      // viewport resize invalidates the screen-space anchor of an active swipe.
      if (width === size.current.width && height === size.current.height) return;
      stroke.current = []; game.current.cancel(); size.current = { width, height };
      rink.current?.resize(width, height); sync();
    }}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={contextCreated} msaaSamples={4} />
      <View style={s.arenaTouch} accessibilityLabel="Drag anywhere to draw a pass or shot from the puck." />
      {!ready && !error && <View pointerEvents="none" style={s.center}><Text style={s.body}>Hitting the ice…</Text></View>}
      {ready && !error && g.introRemaining > 0 && <View style={s.overlay}>
        <Rise style={s.intro}>
          <Text accessibilityLiveRegion="polite" style={s.countdown}>{Math.ceil(g.introRemaining)}</Text>
          <View style={s.introCopy}><Text style={s.kicker}>MAKE IT COUNT</Text>
            {g.objectives.map(o => <Text key={o.id} style={s.introObjective}>☆ {o.label}</Text>)}
          </View>
        </Rise>
      </View>}
      {!!error && <View style={s.overlay}><View style={s.resultContent}><Text style={s.resultTitle}>ICE DELAY</Text><Text style={s.body}>The rink couldn’t load. Reopen the level to try again.</Text><Text selectable style={s.errorText}>{error}</Text><Button style={s.primary} onPress={back}><Text style={s.primaryText}>BACK TO CAMPAIGN</Text></Button></View></View>}
      {!!g.callout && (!g.terminal || g.terminalTime < 1.1) && <Callout text={g.callout} eventId={g.eventId} />}
      {showObjectives && g.paused && <Rise style={s.objectivesSheet}>
        <Text style={s.kicker}>CHASE THREE STARS</Text>
        {g.objectives.map(o => <Text key={o.id} style={s.introObjective}>☆ {o.label}</Text>)}
        <Button style={s.secondary} onPress={() => setShowObjectives(false)}><Text style={s.secondaryText}>GOT IT · BACK TO THE PLAY</Text></Button>
      </Rise>}
      {lesson !== null && (practiced || g.terminal || (g.paused && g.passes > 0)) && !error && <View style={s.overlay}>
        <ScrollView style={s.resultScroll} contentContainerStyle={s.resultContent}>
          <Text style={s.resultTitle}>{practiced ? 'NICE WORK!' : 'TRY IT AGAIN'}</Text>
          <Text style={s.body}>{practiced ? LESSONS[lesson].success : g.terminal ? g.message : LESSONS[lesson].hint}</Text>
          <Button style={s.primary} onPress={() => practiced ? lesson < LESSONS.length - 1 ? startLesson(lesson + 1) : back() : retry()}><Text style={s.primaryText}>{practiced ? lesson < LESSONS.length - 1 ? 'NEXT LESSON' : 'PLAY THE CAMPAIGN' : 'RETRY LESSON'}</Text></Button>
          <Button style={s.secondary} onPress={back}><Text style={s.secondaryText}>BACK TO CAMPAIGN</Text></Button>
        </ScrollView>
      </View>}
      {lesson === null && g.terminal && g.terminalTime >= 1.1 && !error && <View style={s.overlay}>
        <ScrollView style={s.resultScroll} contentContainerStyle={s.resultContent} showsVerticalScrollIndicator={false}>
          <Rise><Text style={s.kicker}>{victory ? count === 3 ? 'PERFECT HIGHLIGHT' : 'ON THE REEL' : 'ONE MORE RUSH'}</Text>
            <Text style={[s.resultTitle, !victory && s.failTitle]}>{victory ? count === 3 ? 'BAR DOWN!' : 'WHAT A FINISH!' : 'SO CLOSE.'}</Text>
          </Rise>
          {victory && <Stars count={count} animate />}
          <Text style={s.body}>{victory ? g.level.title : g.message}</Text>
          {g.objectives.map(o => <View key={o.id} style={s.objectiveRow}><Text style={[s.objectiveMark, !o.complete && s.muted]}>{o.complete ? '★' : '☆'}</Text><Text style={s.objectiveText}>{o.label}</Text></View>)}
          {!!saveError && <Button onPress={persist}><Text style={s.errorText}>{saveError}</Text></Button>}
          {victory && g.levelIndex < LEVELS.length - 1
            ? <Button style={s.primary} onPress={() => selectLevel(g.levelIndex + 1)}><Text style={s.primaryText}>NEXT RUSH  →</Text></Button>
            : <Button style={s.primary} onPress={victory ? back : retry}><Text style={s.primaryText}>{victory ? 'CAMPAIGN CLEARED  ★' : 'RUN IT BACK  ↻'}</Text></Button>}
          {victory && <Button style={s.secondary} onPress={retry}><Text style={s.secondaryText}>{count === 3 ? 'DO IT AGAIN' : 'CHASE THREE STARS'}  ↻</Text></Button>}
          <Text style={s.body}>{victory ? `Best run: ${stars(progress.current.runs[g.levelIndex])} / 3 stars` : 'Fresh ice. Fresh chance.'}</Text>
        </ScrollView>
      </View>}
    </View>
    <Quiet live={live}>
      <View style={s.bottom}>
        {!!g.availablePowerup && <Button style={s.powerButton} disabled={!!g.armed} onPress={() => { stroke.current = []; g.activatePowerup(); sync(); }}><Text style={s.powerText}>{g.armed ? 'READY · ' : '⚡ '}{powerNames[g.availablePowerup]}{g.armed ? '' : ' · TAP TO CHARGE'}</Text></Button>}
        <View style={s.promptRow}>
          <View style={s.promptCopy}><Text numberOfLines={1} style={s.promptTitle}>{lesson === null ? prompt : LESSONS[lesson].title}</Text>{(!!hint || lesson !== null) && <Text numberOfLines={lesson === null ? 2 : 4} style={s.promptBody}>{lesson === null ? hint : LESSONS[lesson].hint}</Text>}</View>
          {lesson === null && g.paused && <Button style={s.objectiveButton} label="View the three star objectives" onPress={() => setShowObjectives(value => !value)}><Text style={s.objectiveGlyph}>☆ 3</Text></Button>}
        </View>
      </View>
    </Quiet>
  </SafeAreaView>;
}

export default function App() {
  return <MotionProvider><GameApp /></MotionProvider>;
}
