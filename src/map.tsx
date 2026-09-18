import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { HIGHLIGHTS, LEVELS, OBJECTIVE_SHORT } from './content';
import { isUnlocked, stars, type Progress } from './progress';
import { TOTAL_STARS, VENUES, currentLevel, isPlayable, isVenueOpen, totalStars, venueStars, venueOfLevel, type Venue } from './venues';
import { Band, Button, DashLine, Glow, Rule, StarRing, useReducedMotion, useShake, s } from './ui';
import { c, fonts, radii, shadow, t } from './theme';

// Node x offsets meander around the dashed climb at x = 44.
const NODE_X = [24, 82, 96];
const NODE_PITCH = 80;
const PATH_X = 44;

/** The 44x52 figure that stands on the current node. */
function MapAvatar({ number }: { number: number }) {
  return <View pointerEvents="none" style={m.avatar}>
    <View style={m.avatarHead}><View style={m.avatarHelmet} /></View>
    <View style={m.avatarJersey}><Text style={m.avatarNumber}>{number}</Text></View>
  </View>;
}

function VenueBanner({ venue, state }: { venue: Venue; state: 'active' | 'cleared' | 'next' }) {
  const color = state === 'active' ? c.teal : state === 'next' ? c.gold : c.ice600;
  return <View style={m.banner}>
    <Rule color={color} />
    <Text style={[m.bannerLabel, { color }]}>VENUE {String(venue.order + 1).padStart(2, '0')} · {venue.name}</Text>
    <Rule color={color} flip />
  </View>;
}

function TrophyStrip({ venue, earned }: { venue: Venue; earned: number }) {
  const target = venue.count * 3, left = target - earned;
  return <View style={m.trophy}>
    <Text style={m.trophyStar}>★</Text>
    <Text style={m.trophyLabel}>PERFECT-RUN TROPHY · {earned} / {target} ★</Text>
    <Text style={m.trophyLeft}>{left > 0 ? `${left} LEFT` : 'EARNED'}</Text>
  </View>;
}

const GateCard = React.forwardRef<View, { venue: Venue; earned: number; style?: object }>(function GateCard({ venue, earned, style }, ref) {
  return <Animated.View ref={ref as never} style={[m.gate, style]}>
    <View style={m.gateLock}><Text style={m.gateLockGlyph}>🔒</Text></View>
    <View style={m.gateCopy}>
      <Text style={m.gateEyebrow}>VENUE {String(venue.order + 1).padStart(2, '0')} · {venue.name}</Text>
      <Text style={m.gateHeadline}>SEALED · {venue.gateStars} ★ TO OPEN</Text>
    </View>
    <Text style={m.gateCount}>{earned}<Text style={m.gateCountOf}>/{venue.gateStars}</Text></Text>
  </Animated.View>;
});

function LevelRow({ index, earned, state, onPress }: {
  index: number; earned: number; state: 'cleared' | 'next' | 'locked'; onPress: (x: number, y: number) => void;
}) {
  const left = NODE_X[index % NODE_X.length];
  const cleared = state === 'cleared';
  const label = cleared ? (earned === 3 ? '3 / 3 ★ PERFECT' : `${earned} / 3 ★ · REPLAY`) : state === 'next' ? 'NEXT AFTER THIS' : 'LOCKED';
  return <View style={m.row}>
    <Button style={[m.rowTap, { left }, state === 'locked' && m.rowLocked, state === 'next' && m.rowNext]}
      label={`Level ${index + 1}. ${LEVELS[index].title}. ${label}.`}
      onPress={event => onPress(event.nativeEvent.pageX, event.nativeEvent.pageY)}>
      <View style={m.node}>
        <StarRing size={52} stars={earned} track={cleared ? c.ringTrack : c.ringIdle} arc={cleared ? c.gold : c.ringIdle} />
        <View style={[m.nodeInner, cleared ? m.nodeInnerCleared : m.nodeInnerLocked, !cleared && state === 'locked' && m.nodeInnerDashed]}>
          <Text style={[m.nodeNumber, cleared && m.nodeNumberCleared]}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
      </View>
      <View style={m.rowCopy}>
        <Text numberOfLines={1} style={[m.rowTitle, cleared ? m.rowTitleCleared : state === 'next' ? m.rowTitleNext : m.rowTitleLocked]}>{LEVELS[index].title}</Text>
        <Text style={[m.rowState, cleared && earned === 3 && m.rowStatePerfect]}>{label}</Text>
      </View>
    </Button>
  </View>;
}

function CurrentRow({ index, playerNumber, onPress, onLayout }: {
  index: number; playerNumber: number; onPress: (x: number, y: number) => void; onLayout: (event: LayoutChangeEvent) => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current, reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [pulse, reduced]);
  return <View style={m.currentRow} onLayout={onLayout}>
    <Button style={m.currentTap} label={`Play level ${index + 1}. ${LEVELS[index].title}.`}
      onPress={event => onPress(event.nativeEvent.pageX, event.nativeEvent.pageY)}>
      <View style={m.currentNode}>
        <Animated.View style={[m.currentHalo, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]} />
        <View style={m.currentDisc}>
          <Text style={m.currentNumber}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={m.currentPlay}>PLAY</Text>
        </View>
        <MapAvatar number={playerNumber} />
      </View>
      <View style={m.currentCopy}>
        <Text style={m.currentEyebrow}>YOU ARE HERE</Text>
        <Text style={m.currentTitle}>{LEVELS[index].title}</Text>
        <Text style={m.currentHint}>Tap the puck to see the three stars.</Text>
      </View>
    </Button>
  </View>;
}

export function CampaignMap({ progress, loaded, error, save, select, soundOn, toggleSound, profileName, playerNumber, openProfile, openAchievements }: {
  progress: Progress; loaded: boolean; error: string; save: () => void; select: (index: number) => void;
  soundOn: boolean; toggleSound: () => void; profileName: string; playerNumber: number;
  openProfile: () => void; openAchievements: () => void;
}) {
  const scroll = useRef<ScrollView | null>(null);
  const [viewport, setViewport] = useState(Dimensions.get('window').height);
  const [contentHeight, setContentHeight] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [sectionY, setSectionY] = useState(0);
  const [sectionHeights, setSectionHeights] = useState<Record<string, number>>({});
  const [card, setCard] = useState<{ index: number; x: number; y: number } | null>(null);
  const settled = useRef(false);
  const gate = useShake();

  const total = totalStars(progress);
  const current = useMemo(() => {
    for (let i = 0; i < LEVELS.length; i++) if (!progress.runs[String(i)]?.[0] && isPlayable(progress, i, total)) return i;
    return -1;
  }, [progress, total]);
  // With every venue gated shut there is no current node, but the map still
  // centres on the venue the player is trying to get into.
  const focus = current >= 0 ? current : currentLevel(progress);
  const sealed = VENUES.find(venue => !isVenueOpen(progress, venue, total));
  const activeVenue = venueOfLevel(focus);

  // Land the current node at 62% of the viewport, once, after layout settles.
  useEffect(() => {
    if (settled.current || !loaded || !contentHeight || !currentY) return;
    settled.current = true;
    const node = sectionY + currentY + 108; // 108 = map scroll padding above the first band.
    const y = Math.max(0, Math.min(contentHeight - viewport, node - viewport * 0.62 + NODE_PITCH));
    requestAnimationFrame(() => scroll.current?.scrollTo({ y, animated: false }));
  }, [loaded, contentHeight, currentY, sectionY, viewport]);

  const tapNode = (index: number, x: number, y: number) => {
    if (!loaded) return;
    if (!isPlayable(progress, index, total)) { gate.shake(); return; }
    setCard({ index, x, y });
  };

  // Venues stack bottom-to-top: the last venue renders first so venue 01 sits
  // at the foot of the climb. Each open venue owns a full-bleed band.
  const sections = VENUES.slice().reverse().map(venue => {
    const open = isVenueOpen(progress, venue, total);
    if (!open) {
      return sealed && sealed.order === venue.order
        ? <GateCard key={`gate-${venue.id}`} venue={venue} earned={total} style={gate.style} />
        : null;
    }
    const last = venue.start + venue.count - 1;
    const holdsFocus = focus >= venue.start && focus <= last;
    const behind = last < focus;
    const rows: React.ReactNode[] = [];
    for (let offset = venue.count - 1; offset >= 0; offset--) {
      const index = venue.start + offset;
      if (index === focus && current >= 0) {
        rows.push(<CurrentRow key={`level-${index}`} index={index} playerNumber={playerNumber}
          onPress={(x, y) => tapNode(index, x, y)} onLayout={event => setCurrentY(event.nativeEvent.layout.y)} />);
        continue;
      }
      const state = progress.runs[String(index)]?.[0] ? 'cleared' : isUnlocked(progress, index) ? 'next' : 'locked';
      rows.push(<LevelRow key={`level-${index}`} index={index} earned={stars(progress.runs[String(index)])} state={state}
        onPress={(x, y) => tapNode(index, x, y)} />);
    }
    return <View key={venue.id} style={m.venue}
      onLayout={event => { setSectionHeights(heights => ({ ...heights, [venue.id]: event.nativeEvent.layout.height })); if (holdsFocus) setSectionY(event.nativeEvent.layout.y); }}>
      <Band colors={venue.band} />
      <Glow color={venue.accent} opacity={0.1} cy="34%" ry="52%" />
      {!!sectionHeights[venue.id] && <>
        <View style={[m.path, { top: 0 }]}><DashLine height={sectionHeights[venue.id]} color={behind ? c.teal : c.pathIdle} /></View>
        {holdsFocus && currentY > 0 && <View style={[m.path, { top: currentY }]}>
          <DashLine height={Math.max(0, sectionHeights[venue.id] - currentY)} color={c.teal} />
        </View>}
      </>}
      <VenueBanner venue={venue} state={venue.order === activeVenue.order ? 'active' : venue.order < activeVenue.order ? 'cleared' : 'next'} />
      <TrophyStrip venue={venue} earned={venueStars(progress, venue)} />
      {rows}
    </View>;
  });

  return <View style={s.root} onLayout={event => setViewport(event.nativeEvent.layout.height)}>
    <Band colors={activeVenue.band} />
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={m.scroll}>
      <View style={m.content} onLayout={event => setContentHeight(event.nativeEvent.layout.height)}>
        {sections}
      </View>
      {!!error && <Button style={m.errorTap} onPress={save}><Text style={s.errorText}>{error}</Text></Button>}
      {!loaded && <Text style={[s.body, m.loading]}>{error ? 'Your saved progress is safe.' : 'Getting your skates ready…'}</Text>}
      {loaded && current < 0 && <Text style={[s.body, m.loading]}>
        {sealed ? 'Every open level is cleared. Replay one for stars and break the gate.' : 'Campaign cleared. Chase the perfect reel.'}
      </Text>}
    </ScrollView>

    <View style={m.header} pointerEvents="box-none">
      <Button style={[s.chromePill, m.playerPill]} label="Open the locker" onPress={openProfile}>
        <View style={m.playerTile}><Text style={m.playerTileNumber}>{playerNumber}</Text></View>
        <Text numberOfLines={1} style={m.playerName}>{profileName}</Text>
      </Button>
      <View style={m.headerRight}>
        <Button style={s.chromePill} label="Open medals" onPress={openAchievements}>
          <Text style={m.starGlyph}>★</Text><Text style={m.starCount}>{total}</Text><Text style={m.starOf}>/{TOTAL_STARS}</Text>
        </Button>
        <Button style={s.chromeSquare} label={`Sound ${soundOn ? 'on' : 'off'}`} onPress={toggleSound}>
          <Text style={m.soundGlyph}>{soundOn ? '♪' : '♪̸'}</Text>
        </Button>
      </View>
    </View>

    {card !== null && <LevelCard index={card.index} origin={card} progress={progress}
      onClose={() => setCard(null)} onPlay={() => { const index = card.index; setCard(null); select(index); }} />}
  </View>;
}

export function LevelCard({ index, origin, progress, onClose, onPlay }: {
  index: number; origin: { x: number; y: number }; progress: Progress; onClose: () => void; onPlay: () => void;
}) {
  const level = LEVELS[index], venue = venueOfLevel(index), run = progress.runs[String(index)];
  const grow = useRef(new Animated.Value(0)).current, reduced = useReducedMotion();
  const window = Dimensions.get('window');
  useEffect(() => {
    const animation = Animated.timing(grow, { toValue: 1, duration: reduced ? 0 : 220, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [grow, reduced]);
  const scale = grow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const translateX = grow.interpolate({ inputRange: [0, 1], outputRange: [origin.x - window.width / 2, 0] });
  const translateY = grow.interpolate({ inputRange: [0, 1], outputRange: [origin.y - window.height / 2, 0] });
  return <View style={s.fill}>
    <Animated.View style={[s.fill, m.cardScrim, { opacity: grow }]}>
      <Button style={s.fill} quiet label="Close" onPress={onClose}><View /></Button>
    </Animated.View>
    <View style={m.cardWrap} pointerEvents="box-none">
      <Animated.View style={[m.card, { opacity: grow, transform: [{ translateX }, { translateY }, { scale }] }]}>
        <View style={m.cardHead}>
          <Band colors={['#0C2B3A', '#0A2434', c.inkRaised]} />
          <View style={m.cardHeadRow}>
            <View style={m.cardDisc}><Text style={m.cardDiscNumber}>{String(index + 1).padStart(2, '0')}</Text></View>
            <Text style={m.cardVenue}>{venue.name}</Text>
          </View>
          <Button style={m.cardClose} label="Close" onPress={onClose}><Text style={m.cardCloseGlyph}>✕</Text></Button>
        </View>
        <View style={m.cardBody}>
          <Text style={m.cardTitle}>{level.title}</Text>
          <Text style={m.cardTagline}>{HIGHLIGHTS[index]}</Text>
          <View style={m.cardStars}>
            {level.objectives.map((id, i) => <View key={id} style={m.cardStarTile}>
              <Text style={[m.cardStarGlyph, run?.[i] && m.cardStarEarned]}>{run?.[i] ? '★' : '☆'}</Text>
              <Text style={m.cardStarLabel}>{OBJECTIVE_SHORT[id]}</Text>
            </View>)}
          </View>
          <View style={m.cardBest}>
            <Text style={m.cardBestLabel}>BEST RUN</Text>
            <Text style={m.cardBestValue}>{run ? `${stars(run)} / 3 ★` : 'NOT PLAYED YET'}</Text>
          </View>
          <Button style={m.cardPlay} label={`Play ${level.title}`} onPress={onPlay}>
            <Text style={m.cardPlayGlyph}>▶</Text><Text style={m.cardPlayText}>HIT THE ICE</Text>
          </Button>
        </View>
      </Animated.View>
    </View>
  </View>;
}

export function VenueUnlocked({ venue, playerNumber, nextLevel, onEnter }: {
  venue: Venue; playerNumber: number; nextLevel: number; onEnter: () => void;
}) {
  const previous = VENUES[venue.order - 1];
  return <View style={s.root}>
    <View style={m.unlockBand}><Band colors={['#123024', '#0A2230', c.ink]} /></View>
    <Glow color={c.gold} opacity={0.22} />
    <View style={m.unlockContent}>
      <View style={m.unlockHead}>
        <Text style={m.unlockEyebrow}>{venue.gateStars} / {venue.gateStars} ★ EARNED</Text>
        <Text style={m.unlockTitle}>GATE{'\n'}BROKEN</Text>
        <Text style={m.unlockLine}>{previous ? `${title(previous.name)} is behind you.` : 'The climb starts here.'} {tagline(venue)}</Text>
      </View>
      <View style={m.unlockCard}>
        <View style={m.unlockTrophy}><Band colors={[c.goldLight, '#F2B93B', c.goldDark]} /><Text style={m.unlockTrophyGlyph}>★</Text></View>
        <View style={m.unlockCardCopy}>
          <Text style={m.unlockCardEyebrow}>VENUE {String(venue.order + 1).padStart(2, '0')} UNLOCKED</Text>
          <Text style={m.unlockCardTitle}>{title(venue.name)}</Text>
          <Text style={m.unlockCardNote}>{venue.count} levels · new locker reward at 3 ★</Text>
        </View>
      </View>
      <View style={m.banner}>
        <Rule color={c.gold} />
        <Text style={[m.bannerLabel, { color: c.gold }]}>VENUE {String(venue.order + 1).padStart(2, '0')} · {venue.name}</Text>
        <Rule color={c.gold} flip />
      </View>
      <View style={m.unlockNodeRow}>
        <View style={m.currentNode}>
          <View style={m.currentHalo} />
          <View style={m.currentDisc}>
            <Text style={m.currentNumber}>{String(nextLevel + 1).padStart(2, '0')}</Text>
            <Text style={m.currentPlay}>PLAY</Text>
          </View>
          <MapAvatar number={playerNumber} />
        </View>
        <View style={m.currentCopy}>
          <Text style={m.currentEyebrow}>FIRST SHIFT HERE</Text>
          <Text style={m.currentTitle}>{LEVELS[nextLevel].title}</Text>
        </View>
      </View>
      <View style={m.unlockFoot}>
        <Button style={s.primary} label={venue.cta} onPress={onEnter}><Text style={s.primaryText}>{venue.cta} →</Text></Button>
      </View>
    </View>
  </View>;
}

const title = (name: string) => name.charAt(0) + name.slice(1).toLowerCase();
const tagline = (venue: Venue) => venue.order >= 4 ? 'The building is louder.' : 'The ice gets faster from here.';

const m = StyleSheet.create({
  scroll: { paddingTop: 108, paddingBottom: 72 },
  content: { position: 'relative' },
  venue: { position: 'relative', paddingBottom: 6 },
  path: { position: 'absolute', left: PATH_X, width: 2 },
  loading: { textAlign: 'center', marginTop: 18, paddingHorizontal: 24 },
  errorTap: { marginHorizontal: 18, marginTop: 14 },

  header: { position: 'absolute', left: 18, right: 18, top: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  playerPill: { paddingLeft: 6, gap: 8, maxWidth: 190 },
  playerTile: { width: 24, height: 24, borderRadius: 8, backgroundColor: c.teal, alignItems: 'center', justifyContent: 'center' },
  playerTileNumber: { fontFamily: fonts.displayItalic, fontSize: 11, color: c.ink },
  playerName: { ...t.label, color: c.chromeText, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starGlyph: { color: c.gold, fontSize: 12 },
  starCount: { fontFamily: fonts.numeral, fontSize: 12, color: c.gold },
  starOf: { fontFamily: fonts.numeralLight, fontSize: 10, color: c.ice600, marginLeft: -2 },
  soundGlyph: { fontSize: 15, color: c.locked, fontFamily: fonts.bodyStrong },

  banner: { marginHorizontal: 18, height: 46, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerLabel: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 3 },

  trophy: { marginHorizontal: 18, marginBottom: 12, height: 34, paddingHorizontal: 12, borderRadius: radii.chip, backgroundColor: c.goldWash, borderWidth: 1, borderColor: c.goldEdge, flexDirection: 'row', alignItems: 'center', gap: 9 },
  trophyStar: { color: c.gold, fontSize: 14 },
  trophyLabel: { flex: 1, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.6, color: c.gold },
  trophyLeft: { fontFamily: fonts.numeralLight, fontSize: 10, color: c.goldQuiet },

  gate: { marginHorizontal: 18, marginBottom: 18, padding: 12, paddingHorizontal: 14, borderRadius: radii.card, backgroundColor: 'rgba(6,21,32,0.7)', borderWidth: 1, borderStyle: 'dashed', borderColor: c.dashedEdge, flexDirection: 'row', alignItems: 'center', gap: 12 },
  gateLock: { width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(157,188,203,0.12)', alignItems: 'center', justifyContent: 'center' },
  gateLockGlyph: { fontSize: 17, opacity: 0.55 },
  gateCopy: { flex: 1 },
  gateEyebrow: { ...t.eyebrow, color: c.lockedDim },
  gateHeadline: { fontFamily: fonts.displayItalic, fontSize: 15, letterSpacing: -0.3, color: c.locked, marginTop: 3 },
  gateCount: { fontFamily: fonts.numeral, fontSize: 14, color: c.gold },
  gateCountOf: { color: c.lockedDeep },

  row: { height: NODE_PITCH },
  rowTap: { position: 'absolute', top: 14, flexDirection: 'row', alignItems: 'center', gap: 13, paddingRight: 18 },
  rowLocked: { opacity: 0.5 },
  rowNext: { opacity: 0.82 },
  node: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  nodeInner: { width: 41, height: 41, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  nodeInnerCleared: { backgroundColor: c.tealNode },
  nodeInnerLocked: { backgroundColor: c.nodeLocked, borderWidth: 1, borderColor: c.ringIdle },
  nodeInnerDashed: { borderStyle: 'dashed' },
  nodeNumber: { fontFamily: fonts.numeral, fontSize: 14, color: '#6F93A6' },
  nodeNumberCleared: { color: c.teal },
  rowCopy: { flexShrink: 1 },
  rowTitle: { fontFamily: fonts.display, fontSize: 12, letterSpacing: -0.2 },
  rowTitleCleared: { color: c.ice200 },
  rowTitleNext: { color: c.bodyBright },
  rowTitleLocked: { color: c.lockedDim },
  rowState: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.4, color: c.ice600, marginTop: 2 },
  rowStatePerfect: { color: c.teal },

  currentRow: { height: 132 },
  currentTap: { position: 'absolute', left: 18, right: 18, top: 22, flexDirection: 'row', alignItems: 'center', gap: 15 },
  currentNode: { width: 88, height: 88 },
  currentHalo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 44, backgroundColor: c.goldHalo, ...shadow.gold },
  currentDisc: { position: 'absolute', top: 7, left: 7, right: 7, bottom: 7, borderRadius: 37, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  currentNumber: { fontFamily: fonts.numeral, fontSize: 19, lineHeight: 21, color: c.ink },
  currentPlay: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.3, color: c.ink, marginTop: 2 },
  currentCopy: { flex: 1 },
  currentEyebrow: { ...t.eyebrow, color: c.gold },
  currentTitle: { ...t.displayL, color: c.ice100, marginTop: 5 },
  currentHint: { ...t.body, color: c.ice400, marginTop: 6 },

  avatar: { position: 'absolute', left: -16, top: -30, width: 44, height: 52 },
  avatarHead: { position: 'absolute', left: 10, top: 0, width: 24, height: 22, borderRadius: 9, backgroundColor: '#C78F68', borderWidth: 2, borderColor: c.ink },
  avatarHelmet: { position: 'absolute', left: -2, top: -3, right: -2, height: 14, backgroundColor: c.ice200, borderWidth: 2, borderColor: c.ink, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  avatarJersey: { position: 'absolute', left: 6, top: 20, width: 32, height: 28, borderRadius: 8, backgroundColor: c.teal, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  avatarNumber: { fontFamily: fonts.display, fontSize: 11, color: c.ink },

  cardScrim: { backgroundColor: 'rgba(4,16,26,0.72)' },
  cardWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 14 },
  card: { borderRadius: radii.modal, backgroundColor: c.inkRaised, borderWidth: 1, borderColor: c.surfaceBorderStrong, overflow: 'hidden', ...shadow.modal },
  cardHead: { height: 104, overflow: 'hidden' },
  cardHeadRow: { position: 'absolute', left: 16, top: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDisc: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  cardDiscNumber: { fontFamily: fonts.numeral, fontSize: 13, color: c.ink },
  cardVenue: { ...t.eyebrow, color: c.teal, letterSpacing: 2.2 },
  cardClose: { position: 'absolute', right: 14, top: 14, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(4,16,26,0.72)', alignItems: 'center', justifyContent: 'center' },
  cardCloseGlyph: { fontSize: 15, lineHeight: 18, color: c.locked },
  cardBody: { paddingTop: 2, paddingHorizontal: 20, paddingBottom: 20 },
  cardTitle: { ...t.cardTitle, color: c.ice100 },
  cardTagline: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, letterSpacing: 0.4, color: c.ice400, marginTop: 10 },
  cardStars: { flexDirection: 'row', gap: 9, marginTop: 18 },
  cardStarTile: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, alignItems: 'center', gap: 5 },
  cardStarGlyph: { color: c.ice700, fontSize: 16 },
  cardStarEarned: { color: c.gold },
  cardStarLabel: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.1, color: c.ice400, textAlign: 'center' },
  cardBest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.meterTrack },
  cardBestLabel: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.8, color: c.ice600 },
  cardBestValue: { fontFamily: fonts.numeralLight, fontSize: 11, color: c.ice400 },
  cardPlay: { marginTop: 16, height: 60, borderRadius: radii.card, backgroundColor: c.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  cardPlayGlyph: { fontSize: 17, color: c.ink },
  cardPlayText: { fontFamily: fonts.displayItalic, fontSize: 20, letterSpacing: -0.5, color: c.ink },

  unlockBand: { position: 'absolute', left: 0, right: 0, top: 0, height: 540 },
  unlockContent: { flex: 1, paddingHorizontal: 20, paddingTop: 96, paddingBottom: 44 },
  unlockHead: { alignItems: 'center', paddingHorizontal: 6, marginTop: 110 },
  unlockEyebrow: { ...t.eyebrow, color: c.teal, letterSpacing: 3.6 },
  unlockTitle: { fontFamily: fonts.displayItalic, fontSize: 44, lineHeight: 41, letterSpacing: -2, color: c.gold, textAlign: 'center', marginTop: 12, textShadowColor: 'rgba(255,197,49,0.34)', textShadowRadius: 22, textShadowOffset: { width: 0, height: 8 } },
  unlockLine: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, letterSpacing: 0.4, color: c.bodyBright, marginTop: 14, textAlign: 'center' },
  unlockCard: { marginTop: 34, borderRadius: radii.panel, backgroundColor: 'rgba(6,21,32,0.78)', borderWidth: 1, borderColor: 'rgba(255,197,49,0.34)', padding: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  unlockTrophy: { width: 48, height: 48, borderRadius: radii.chip, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  unlockTrophyGlyph: { fontSize: 21, color: c.ink },
  unlockCardCopy: { flex: 1 },
  unlockCardEyebrow: { ...t.eyebrow, color: c.gold, letterSpacing: 2.2 },
  unlockCardTitle: { fontFamily: fonts.displayItalic, fontSize: 21, letterSpacing: -0.6, color: c.ice100, marginTop: 4 },
  unlockCardNote: { ...t.body, color: c.ice400, marginTop: 4 },
  unlockNodeRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 15, paddingLeft: 4 },
  unlockFoot: { marginTop: 'auto' },
});
