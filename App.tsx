import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, PanResponder, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Game, type Point, distance, relativeAim } from './src/game';
import { LEVELS } from './src/content';
import { Rink } from './src/rink';
import { Button, MotionProvider, Quiet, Rise, s, useGameFonts } from './src/ui';
import { c } from './src/theme';
import { CampaignMap, VenueUnlocked } from './src/map';
import { CalloutPlate, HudChrome, IntroCountdown, PlayControls, ResultPanel, objectiveValue, type ResultObjective } from './src/hud';
import { audio } from './src/sound';
import { SOUND_PLAYS_IN_SILENT_MODE } from './src/audioPolicy';
import { drainSoundEvents } from './src/audioEvents';
import { emptyProgress, parseProgress, recordRun, stars } from './src/progress';
import { VENUES, isPlayable, openVenues, venueOfLevel } from './src/venues';
import { LESSONS, lessonComplete, tutorialGame } from './src/tutorial';
import { completedAchievementCount, emptyAchievements, observeAchievementEvent, parseAchievements, type AchievementDefinition } from './src/achievements';
import { defaultProfile, parseProfile, sanitizeProfile, type PlayerProfile } from './src/profile';
import { AchievementToast, AchievementsScreen, ProfileScreen, selectedRinkCosmetics } from './src/progressionUI';

const SAVE_KEY = 'bardown.progress.v1';
const TUTORIAL_KEY = 'bardown.tutorial.v1';
const SOUND_KEY = 'bardown.sound-enabled.v1';
const PROFILE_KEY = 'bardown.profile.v1';
const ACHIEVEMENTS_KEY = 'bardown.achievements.v1';

/** Stroke length stands in for shot power while the play is being drawn. */
function drawPower(preview: readonly Point[]) {
  if (preview.length < 2) return 0;
  let length = 0;
  for (let i = 1; i < preview.length; i++) length += distance(preview[i - 1], preview[i]);
  return Math.max(0, Math.min(1, length / 18));
}

function GameApp() {
  const game = useRef(new Game());
  const rink = useRef<Rink | null>(null);
  const frame = useRef(0);
  const mounted = useRef(true);
  const active = useRef(true);
  const screen = useRef<'levels' | 'game' | 'profile' | 'achievements' | 'venue'>('levels');
  const tutorial = useRef<number | null>(null);
  const chased = useRef(false);
  const [showHelp, setShowHelp] = useState(false);
  const progress = useRef(emptyProgress());
  const profile = useRef(defaultProfile());
  const achievements = useRef(emptyAchievements());
  const recorded = useRef<Game | null>(null);
  const retries = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  const profileSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundSaveQueue = useRef(Promise.resolve());
  const soundEnabled = useRef(true);
  const soundPreferenceTouched = useRef(false);
  const audioReady = useRef(false);
  const audioEvents = useRef<{ game: Game | null; eventId: number }>({ game: null, eventId: 0 });
  const audioScene = useRef<'menu' | 'aim' | 'play' | 'result'>('menu');
  const [soundOn, setSoundOn] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [achievementQueue, setAchievementQueue] = useState<AchievementDefinition[]>([]);
  const [venueReveal, setVenueReveal] = useState<number | null>(null);
  const size = useRef({ width: 1, height: 1 });
  const stroke = useRef<Point[]>([]);
  const started = useRef(0);
  const anchor = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [, redraw] = useState(0);
  const lastUI = useRef('');
  const sceneForAudio = (g: Game): 'menu' | 'aim' | 'play' | 'result' => screen.current !== 'game' ? 'menu'
    : g.terminal ? 'result' : g.paused || g.introRemaining > 0 ? 'aim' : 'play';
  const syncAudio = () => {
    const g = game.current;
    const cursor = audioEvents.current;
    if (cursor.game !== g) { cursor.game = g; cursor.eventId = 0; }
    const drained = drainSoundEvents(g.events, cursor.eventId);
    cursor.eventId = drained.lastId;
    const scene = sceneForAudio(g);
    if (audioReady.current && scene !== audioScene.current) { audioScene.current = scene; audio.setScene(scene); }
    if (audioReady.current) drained.cues.forEach(cue => audio.play(cue));
  };
  const sync = () => {
    const g = game.current;
    syncAudio();
    if (g.loosePuck) chased.current = true;
    if (tutorial.current === null && g.phase === 'SUCCESS' && recorded.current !== g) {
      recorded.current = g;
      const before = progress.current;
      const openBefore = openVenues(before);
      const run = g.objectives.map(o => o.complete);
      progress.current = recordRun(before, g.levelIndex, run);
      const result = observeAchievementEvent(achievements.current, { type: 'run_completed', levelIndex: g.levelIndex, run, facts: {
        shotStyle: g.shotStyle, actionPower: g.actionPower ?? undefined, goalHeight: g.goalHeight,
        curvedActions: g.curvedActions, bankPasses: g.bankPasses, leadPasses: g.leadPasses, passes: g.passes,
        reboundUsed: g.reboundUsed, loosePuckRace: g.loosePuckWins > 0, retry: retries.current > 0,
        highlightRoute: g.levelIndex >= 24 && run.every(Boolean), goals: 1,
      } }, progress.current);
      achievements.current = result.state;
      if (result.unlocked.length) setAchievementQueue(queue => [...queue, ...result.unlocked]);
      // A gate breaking is the campaign beat: hold it for the walk back to the map.
      const openAfter = openVenues(progress.current);
      const opened = VENUES.find(venue => !openBefore.has(venue.order) && openAfter.has(venue.order));
      if (opened) setVenueReveal(opened.order);
      persist();
      persistAchievements();
    }
    const key = `${g.levelIndex}|${g.phase}|${g.stage}|${g.message}|${g.intent.kind}|${g.preview.length > 0}|${g.preview.some(p => p.bounce)}|${g.eventId}|${Math.ceil(g.introRemaining)}|${g.cornerCovered(g.preview[g.preview.length - 1] ?? g.puck)}|${g.armed}|${g.terminalTime >= 1.1}|${screen.current}|${Math.round(drawPower(g.preview) * 20)}`;
    if (key !== lastUI.current && mounted.current) { lastUI.current = key; redraw(v => v + 1); }
  };

  function persist() {
    const data = JSON.stringify(progress.current);
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(SAVE_KEY, data))
      .then(() => { if (mounted.current) setSaveError(''); })
      .catch(() => { if (mounted.current) setSaveError('Progress is in memory, but could not be saved. Tap to retry saving.'); });
  }

  function persistProfile(next = profile.current) {
    if (profileSaveTimer.current) {
      clearTimeout(profileSaveTimer.current);
      profileSaveTimer.current = null;
    }
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next)))
      .catch(() => { if (mounted.current) setSaveError('Your changes are in memory, but could not be saved. Tap to retry.'); });
  }

  function scheduleProfileSave() {
    if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);
    profileSaveTimer.current = setTimeout(() => persistProfile(), 400);
  }

  function persistAchievements() {
    const data = JSON.stringify(achievements.current);
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(ACHIEVEMENTS_KEY, data))
      .catch(() => { if (mounted.current) setSaveError('Progress is in memory, but could not be saved. Tap to retry saving.'); });
  }

  function persistSound(enabled: boolean) {
    soundSaveQueue.current = soundSaveQueue.current
      .then(() => AsyncStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'))
      .catch(() => {});
  }

  function toggleSound() {
    const enabled = !soundEnabled.current;
    soundPreferenceTouched.current = true;
    soundEnabled.current = enabled;
    setSoundOn(enabled);
    if (audioReady.current) audio.setEnabled(enabled);
    persistSound(enabled);
  }

  function restartAudioForNewScreen() {
    if (!audioReady.current) return;
    const scene = sceneForAudio(game.current);
    audioScene.current = scene;
    audio.setScene(scene);
    // Keep the looping track running through menu/game transitions. Native
    // audio is paused only when the app backgrounds or sound is disabled.
    audio.setActive(active.current);
  }

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(TUTORIAL_KEY).then(value => { if (mounted.current && !value) setShowHelp(true); }).catch(() => {});
    Promise.all([AsyncStorage.getItem(SAVE_KEY), AsyncStorage.getItem(PROFILE_KEY), AsyncStorage.getItem(ACHIEVEMENTS_KEY)])
      .then(([savedProgress, savedProfile, savedAchievements]) => {
        progress.current = parseProgress(savedProgress);
        profile.current = parseProfile(savedProfile);
        achievements.current = parseAchievements(savedAchievements);
      })
      .then(() => { if (mounted.current) setLoaded(true); })
      .catch(() => { if (mounted.current) setSaveError('Could not load your save. Close and reopen the app to retry.'); });
    let disposed = false;
    void (async () => {
      try { await audio.init({ playsInSilentMode: SOUND_PLAYS_IN_SILENT_MODE }); } catch {}
      if (disposed) return;
      try {
        const saved = await AsyncStorage.getItem(SOUND_KEY);
        if (!soundPreferenceTouched.current && (saved === 'on' || saved === 'off')) {
          soundEnabled.current = saved === 'on';
          setSoundOn(soundEnabled.current);
        }
      } catch {
        // Keep the in-memory preference when storage is unavailable.
      }
      if (disposed) return;
      audioReady.current = true;
      const scene = sceneForAudio(game.current);
      audioScene.current = scene;
      audio.setEnabled(soundEnabled.current);
      audio.setScene(scene);
      audio.setActive(active.current);
      syncAudio();
    })();
    const subscription = AppState.addEventListener('change', state => {
      active.current = state === 'active';
      if (audioReady.current) audio.setActive(active.current);
      stroke.current = []; game.current.cancel(); sync();
    });
    return () => {
      if (profileSaveTimer.current) {
        clearTimeout(profileSaveTimer.current);
        profileSaveTimer.current = null;
        persistProfile();
      }
      disposed = true; mounted.current = false; audioReady.current = false; subscription.remove();
      cancelAnimationFrame(frame.current); rink.current?.dispose(); rink.current = null; audio.dispose();
    };
  }, []);

  const deferAchievementToast = screen.current === 'game' && game.current.terminal;
  useEffect(() => {
    if (!achievementQueue.length || deferAchievementToast) return;
    const timer = setTimeout(() => setAchievementQueue(queue => queue.slice(1)), 2400);
    return () => clearTimeout(timer);
  }, [achievementQueue, deferAchievementToast]);

  function contextCreated(gl: ExpoWebGLRenderingContext) {
    if (!mounted.current || screen.current !== 'game') return;
    try {
      cancelAnimationFrame(frame.current);
      rink.current?.dispose();
      rink.current = new Rink(gl, selectedRinkCosmetics(profile.current));
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

  const selectLevel = (index: number, retrying = false) => {
    if (!loaded || !isPlayable(progress.current, index)) return;
    retries.current = retrying ? retries.current + 1 : 0;
    tutorial.current = null;
    stroke.current = []; game.current = new Game(index); game.current.startPreview(); screen.current = 'game'; restartAudioForNewScreen(); sync();
  };
  const startLesson = (lesson: number) => {
    tutorial.current = lesson; chased.current = false; setShowHelp(false);
    stroke.current = []; game.current = tutorialGame(lesson); screen.current = 'game'; restartAudioForNewScreen();
    lastUI.current = ''; sync();
  };
  const retry = () => tutorial.current === null ? selectLevel(game.current.levelIndex, true) : startLesson(tutorial.current);
  const dismissHelp = () => { setShowHelp(false); void AsyncStorage.setItem(TUTORIAL_KEY, 'seen').catch(() => {}); };
  const back = () => {
    tutorial.current = null;
    stroke.current = []; game.current.cancel();
    screen.current = venueReveal === null ? 'levels' : 'venue';
    cancelAnimationFrame(frame.current); rink.current?.dispose(); rink.current = null;
    setReady(false); restartAudioForNewScreen(); sync();
  };
  const openMenuScreen = (target: 'profile' | 'achievements') => {
    screen.current = target; lastUI.current = ''; restartAudioForNewScreen(); redraw(value => value + 1);
  };
  const backToCareer = () => { persistProfile(); screen.current = 'levels'; lastUI.current = ''; redraw(value => value + 1); };
  const changeProfile = (next: PlayerProfile) => {
    profile.current = sanitizeProfile(next); scheduleProfileSave(); redraw(value => value + 1);
  };
  const g = game.current, aiming = g.preview.length > 1, banking = g.preview.some(p => p.bounce);
  const lesson = tutorial.current;
  const practiced = lesson !== null && lessonComplete(g, lesson, chased.current);
  const live = !g.paused && !g.terminal && g.introRemaining <= 0;
  const aimEyebrow = aiming ? 'AIM' : g.reboundUsed ? 'REBOUND' : 'PLAY';
  const aimValue = aiming
    ? banking ? 'OFF THE BOARDS'
      : g.intent.kind === 'shot'
        ? `${(g.preview.at(-1)?.height ?? 0) >= 3 ? 'HIGH' : 'LOW'} ${Math.abs(g.preview.at(-1)?.x ?? 0) < 0.5 ? 'MIDDLE' : (g.preview.at(-1)?.x ?? 0) < 0 ? 'LEFT' : 'RIGHT'}`
        : 'INTO SPACE'
    : lesson !== null ? LESSONS[lesson].title : g.reboundUsed ? 'BURY IT' : g.moment.title;
  const count = g.objectives.filter(o => o.complete).length;
  const victory = g.phase === 'SUCCESS';
  const playerName = `#${profile.current.jerseyNumber} ${profile.current.name || 'PLAYER'}`;

  if (screen.current === 'profile') return <View style={s.root}>
    <StatusBar barStyle="light-content" />
    <ProfileScreen profile={profile.current} progress={progress.current} achievements={achievements.current} onChange={changeProfile} onBack={backToCareer} />
  </View>;

  if (screen.current === 'achievements') return <View style={s.root}>
    <StatusBar barStyle="light-content" />
    <AchievementsScreen state={achievements.current} progress={progress.current} onBack={backToCareer} />
  </View>;

  if (screen.current === 'venue' && venueReveal !== null) {
    const venue = VENUES[venueReveal];
    const nextLevel = Math.min(venue.start, LEVELS.length - 1);
    return <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <VenueUnlocked venue={venue} playerNumber={profile.current.jerseyNumber} nextLevel={nextLevel}
        onEnter={() => { setVenueReveal(null); screen.current = 'levels'; lastUI.current = ''; redraw(value => value + 1); }} />
    </View>;
  }

  if (screen.current === 'levels') return <View style={s.root}>
    <StatusBar barStyle="light-content" />
    <CampaignMap progress={progress.current} loaded={loaded} error={saveError}
      save={() => { if (loaded) { persist(); persistProfile(); persistAchievements(); } }}
      select={selectLevel} soundOn={soundOn} toggleSound={toggleSound}
      profileName={playerName} playerNumber={profile.current.jerseyNumber}
      openProfile={() => openMenuScreen('profile')} openAchievements={() => openMenuScreen('achievements')}
      onHelp={() => setShowHelp(true)} />
    {showHelp && <View style={[StyleSheet.absoluteFill, a.sheetScrim]}>
      <ScrollView style={a.sheet} contentContainerStyle={a.sheetBody}>
        <Text style={s.eyebrow}>WELCOME TO BARDOWN HERO</Text>
        <Text style={a.sheetTitle}>MAKE YOUR PLAY</Text>
        <Text style={s.body}>Drag anywhere to draw from the puck. Lift to play. Time freezes while you aim.</Text>
        <Text style={s.body}>Teal is your team. Red defenders race for passes and loose pucks. Lead a teammate into space or curve around pressure. A red pickup ends the rush.</Text>
        <Text style={s.body}>Flick through the net to shoot. Move left or right for the side; follow through farther beyond the goal for a high shot. A centered low flick tests the pads for a rebound.</Text>
        <Text style={s.body}>Tap the gold ring before drawing when a powerup is lit. Goals unlock levels. Earn all three stars together in one run.</Text>
        <Button style={s.primary} onPress={() => { dismissHelp(); startLesson(0); }}><Text style={s.primaryText}>GUIDED TUTORIAL</Text></Button>
        <Button style={s.secondary} onPress={dismissHelp}><Text style={s.secondaryText}>BACK TO THE MAP</Text></Button>
      </ScrollView>
    </View>}
  </View>;

  const resultObjectives: ResultObjective[] = g.objectives.map(objective => ({
    id: objective.id, label: objective.label, complete: objective.complete, value: objectiveValue(g, objective.id),
  }));
  const venue = venueOfLevel(g.levelIndex);
  const nextIndex = g.levelIndex + 1;
  const moreLevels = nextIndex < LEVELS.length;
  const hasNext = victory && moreLevels && isPlayable(progress.current, nextIndex);
  // A cleared level whose successor is still behind a star gate sends the
  // player back to the map rather than pretending there is a next rush.
  const primaryLabel = hasNext ? 'NEXT RUSH →'
    : !victory ? 'RUN IT BACK ↻'
    : moreLevels ? 'CHASE THE GATE ★' : 'CAMPAIGN CLEARED ★';
  const onPrimary = hasNext ? () => selectLevel(nextIndex) : victory ? back : retry;

  return <View style={s.root} {...gesture.panHandlers}>
    <StatusBar barStyle="light-content" />
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

      {ready && !error && g.introRemaining > 0 && lesson === null &&
        <IntroCountdown seconds={Math.ceil(g.introRemaining)} objectives={g.objectives} />}

      {!!g.callout && (!g.terminal || g.terminalTime < 1.1) && <CalloutPlate text={g.callout} eventId={g.eventId} />}

      {!!error && <View style={[s.fill, a.errorPage]}>
        <Text style={a.errorTitle}>ICE DELAY</Text>
        <Text style={s.body}>The rink couldn’t load. Reopen the level to try again.</Text>
        <Text selectable style={s.errorText}>{error}</Text>
        <Button style={s.primary} onPress={back}><Text style={s.primaryText}>BACK TO THE MAP</Text></Button>
      </View>}

      {lesson !== null && (practiced || g.terminal || (g.paused && g.passes > 0)) && !error && <View style={s.fill}>
        <View style={s.scrim} />
        <View style={a.lessonPage}>
          <Rise style={a.lessonCard}>
            <Text style={s.eyebrow}>PRACTICE {lesson + 1} / {LESSONS.length}</Text>
            <Text style={a.lessonTitle}>{practiced ? 'NICE WORK!' : 'TRY IT AGAIN'}</Text>
            <Text style={s.body}>{practiced ? LESSONS[lesson].success : g.terminal ? g.message : LESSONS[lesson].hint}</Text>
          </Rise>
          <View style={a.lessonActions}>
            <Button style={s.primary} onPress={() => practiced ? lesson < LESSONS.length - 1 ? startLesson(lesson + 1) : back() : retry()}>
              <Text style={s.primaryText}>{practiced ? lesson < LESSONS.length - 1 ? 'NEXT LESSON' : 'PLAY THE CAMPAIGN' : 'RETRY LESSON'}</Text>
            </Button>
            <Button style={s.secondary} onPress={back}><Text style={s.secondaryText}>BACK TO THE MAP</Text></Button>
          </View>
        </View>
      </View>}

      {lesson === null && g.terminal && g.terminalTime >= 1.1 && !error && <ResultPanel
        victory={victory}
        eyebrow={victory ? `LEVEL ${String(g.levelIndex + 1).padStart(2, '0')} CLEARED` : `${venue.name} · ONE MORE RUSH`}
        verdict={victory ? count === 3 ? 'BAR\nDOWN' : 'WHAT A\nFINISH' : 'SO\nCLOSE.'}
        objectives={resultObjectives}
        message={victory ? g.level.title : g.message}
        best={`Best run: ${stars(progress.current.runs[String(g.levelIndex)])} / 3 ★`}
        primaryLabel={primaryLabel} onPrimary={onPrimary}
        onRetry={retry} onBack={back}
        saveError={saveError} onSave={persist} />}
    </View>

    {!error && <HudChrome title={lesson === null ? g.level.title : `PRACTICE ${lesson + 1} / ${LESSONS.length}`}
      index={g.levelIndex} count={LEVELS.length}
      objectives={lesson === null ? g.objectives.map(o => o.complete) : []}
      justEarned={count - 1}
      onBack={back} onRestart={retry} />}

    {!error && !g.terminal && g.introRemaining <= 0 && <Quiet live={live} style={s.fill}>
      <PlayControls eyebrow={aimEyebrow} value={aimValue} power={drawPower(g.preview)}
        powerup={g.availablePowerup} armed={g.armed}
        onActivate={() => { stroke.current = []; g.activatePowerup(); sync(); }} />
    </Quiet>}

    {!!achievementQueue[0] && !deferAchievementToast && <AchievementToast achievement={achievementQueue[0]} />}
  </View>;
}

const a = StyleSheet.create({
  sheetScrim: { backgroundColor: 'rgba(4,16,26,0.82)', justifyContent: 'center', paddingHorizontal: 18 },
  sheet: { flexGrow: 0, flexShrink: 1, maxHeight: '86%', borderRadius: 24, backgroundColor: c.inkRaised, borderWidth: 1, borderColor: c.surfaceBorderStrong },
  sheetBody: { padding: 22, gap: 12 },
  sheetTitle: { fontFamily: 'Archivo_900Black_Italic', fontSize: 32, lineHeight: 32, letterSpacing: -1.4, color: c.ice100 },
  errorPage: { justifyContent: 'center', paddingHorizontal: 24, gap: 12, backgroundColor: 'rgba(4,16,26,0.9)' },
  errorTitle: { fontFamily: 'Archivo_900Black_Italic', fontSize: 34, letterSpacing: -1.2, color: c.gold, textAlign: 'center' },
  lessonPage: { flex: 1, paddingTop: 110, paddingHorizontal: 20, paddingBottom: 44 },
  lessonCard: { borderRadius: 24, backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorderStrong, padding: 22, gap: 8 },
  lessonTitle: { fontFamily: 'Archivo_900Black_Italic', fontSize: 30, letterSpacing: -1.2, color: c.ice100 },
  lessonActions: { marginTop: 'auto', gap: 9 },
});

export default function App() {
  const fontsReady = useGameFonts();
  if (!fontsReady) return <View style={s.root} />;
  return <MotionProvider><GameApp /></MotionProvider>;
}
