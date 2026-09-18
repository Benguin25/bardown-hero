import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ACHIEVEMENTS, completedAchievementCount, type AchievementDefinition, type AchievementState } from './achievements';
import { isChapterComplete, isChapterPerfect } from './career';
import { CHAPTERS } from './content';
import { COSMETICS, isCosmeticUnlocked, type Cosmetic, type CosmeticKind, type PlayerProfile } from './profile';
import type { Progress } from './progress';
import { VENUES, totalStars } from './venues';
import { Band, Button, Glow, Rise, s } from './ui';
import { c, fonts, radii, t } from './theme';

const labels: Record<CosmeticKind, string> = {
  jerseyStyle: 'JERSEY STYLE', jerseyColor: 'JERSEY COLOR', helmetStyle: 'HELMET',
  helmetColor: 'HELMET COLOR', gloveColor: 'GLOVES', stickStyle: 'STICK',
};
const KINDS = Object.keys(labels) as CosmeticKind[];

/** Locked tiles name their unlock in the map's own language. */
function unlockLabel(cosmetic: Cosmetic): string {
  const requirement = cosmetic.requirement;
  if (!requirement) return '';
  if (requirement.type === 'stars') return `${requirement.value} ★ TOTAL`;
  if (requirement.type === 'chapter') return `CLEAR ${VENUES[Number(requirement.value)]?.name ?? 'A VENUE'}`;
  if (requirement.type === 'perfectChapter') return `3 ★ ${VENUES[Number(requirement.value)]?.name ?? 'A VENUE'}`;
  return `${String(requirement.value).replace(/-/g, ' ').toUpperCase()} MEDAL`;
}

/**
 * The figure itself is unchanged from the original locker construction; only
 * the display case around it is new.
 */
function LockerAvatar({ profile, jersey, helmet, gloves, stick }: {
  profile: PlayerProfile; jersey: string; helmet: string; gloves: string; stick: string;
}) {
  const numberColor = profile.jerseyColor === 'ember' ? '#ffffff' : c.ink;
  const accent = profile.jerseyStyle === 'heritage' ? c.gold : '#9ff5df';
  return <View style={p.avatar} accessibilityLabel={`Uniform preview. ${profile.jerseyStyle} jersey, ${profile.helmetStyle} helmet, ${profile.stickStyle} stick.`}>
    <View style={p.head}>
      <View style={[p.avatarHelmet, { backgroundColor: helmet }]} />
      <View style={[p.helmetEar, { backgroundColor: helmet }]} />
      {profile.helmetStyle === 'visor' && <View style={p.helmetVisor} />}
      {profile.helmetStyle === 'cage' && <View style={p.helmetCage}>
        <View style={[p.cageBar, { left: 7 }]} /><View style={[p.cageBar, { left: 18 }]} /><View style={[p.cageBar, { left: 29 }]} />
        <View style={[p.cageCross, { top: 8 }]} /><View style={[p.cageCross, { top: 20 }]} />
      </View>}
    </View>
    <View style={[p.arm, p.armLeft, { backgroundColor: jersey }]}><View style={[p.glove, { backgroundColor: gloves }]} /></View>
    <View style={[p.arm, p.armRight, { backgroundColor: jersey }]}><View style={[p.glove, { backgroundColor: gloves }]} /></View>
    <View style={[p.avatarBody, { backgroundColor: jersey, borderColor: accent }]}>
      {profile.jerseyStyle === 'classic' && <View style={[p.jerseyBand, { backgroundColor: accent }]} />}
      {profile.jerseyStyle === 'stripe' && <><View style={[p.jerseyBand, p.jerseyBandHigh, { backgroundColor: accent }]} /><View style={[p.jerseyBand, p.jerseyBandLow, { backgroundColor: accent }]} /></>}
      {profile.jerseyStyle === 'heritage' && <View style={[p.jerseySplit, { backgroundColor: accent }]} />}
      <Text style={[p.avatarNumber, { color: numberColor }]}>{profile.jerseyNumber}</Text>
    </View>
    <View style={[p.leg, p.legLeft]}><View style={p.skate} /></View><View style={[p.leg, p.legRight]}><View style={p.skate} /></View>
    <View style={[p.avatarStick, { backgroundColor: stick }, profile.stickStyle === 'carbon' && p.carbonStick]}><View style={[p.stickBlade, { backgroundColor: stick }]} />{profile.stickStyle === 'carbon' && <View style={p.stickTape} />}</View>
  </View>;
}

/** Small preview inside a cosmetic tile: a colour chip or a drawn shape. */
function Swatch({ cosmetic, kind, jersey }: { cosmetic: Cosmetic; kind: CosmeticKind; jersey: string }) {
  if (cosmetic.color) return <View style={[p.swatch, { backgroundColor: cosmetic.color }]} />;
  if (kind === 'helmetStyle') return <View style={p.swatchBox}><View style={p.helmetSwatch} />{cosmetic.id === 'cage' && <View style={p.helmetSwatchCage} />}{cosmetic.id === 'visor' && <View style={p.helmetSwatchVisor} />}</View>;
  if (kind === 'stickStyle') return <View style={p.swatchBox}><View style={[p.stickSwatch, { backgroundColor: cosmetic.id === 'carbon' ? '#111820' : '#8B643F' }]} /></View>;
  return <View style={[p.swatch, { backgroundColor: jersey, overflow: 'hidden' }]}>
    {cosmetic.id === 'stripe' && <><View style={[p.swatchStripe, { top: 10 }]} /><View style={[p.swatchStripe, { top: 20 }]} /></>}
    {cosmetic.id === 'heritage' && <View style={p.swatchSplit} />}
    {cosmetic.id === 'classic' && <View style={[p.swatchStripe, { top: 14, height: 8 }]} />}
  </View>;
}

export function ProfileScreen({ profile, progress, achievements, onChange, onBack }: {
  profile: PlayerProfile; progress: Progress; achievements: AchievementState;
  onChange: (profile: PlayerProfile) => void; onBack: () => void;
}) {
  const unlocks = useMemo(() => ({
    totalStars: totalStars(progress),
    completedChapters: new Set(CHAPTERS.map((_, i) => i).filter(i => isChapterComplete(progress, i))),
    perfectChapters: new Set(CHAPTERS.map((_, i) => i).filter(i => isChapterPerfect(progress, i))),
    achievements: new Set(Object.keys(achievements.completed)),
  }), [progress, achievements]);
  const choose = (kind: CosmeticKind, id: string) => onChange({ ...profile, [kind]: id });
  const color = (kind: CosmeticKind, id: string) => COSMETICS.find(item => item.kind === kind && item.id === id)?.color;
  const jersey = color('jerseyColor', profile.jerseyColor) ?? '#F4FAFF';
  const helmet = color('helmetColor', profile.helmetColor) ?? '#FFFFFF';
  const gloves = color('gloveColor', profile.gloveColor) ?? '#17191D';
  const stick = profile.stickStyle === 'carbon' ? '#111820' : '#8B643F';

  return <View style={s.root}>
    <Band colors={['#0A2331', '#071B27', c.ink]} />
    <ScrollView contentContainerStyle={p.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Rise style={p.top}>
        <Button style={s.chromeSquare} label="Back to the map" onPress={onBack}><Text style={s.chromeGlyph}>‹</Text></Button>
        <View style={p.topCopy}>
          <Text style={p.kicker}>THE LOCKER</Text>
          <Text style={s.screenTitle}>MAKE IT YOURS</Text>
        </View>
      </Rise>

      <View style={p.case}>
        <Band colors={['#123C48', '#0F3442', '#0B2836']} />
        <Glow color={c.teal} opacity={0.26} cy="0%" cx="50%" rx="80%" ry="34%" />
        <View style={p.caseRing} />
        <LockerAvatar profile={profile} jersey={jersey} helmet={helmet} gloves={gloves} stick={stick} />
        <View style={p.caseCaption}>
          <View style={{ flex: 1 }}>
            <Text style={p.caseName}>#{profile.jerseyNumber} {(profile.name || 'PLAYER').toUpperCase()}</Text>
            <Text style={p.caseKit}>{profile.jerseyStyle.toUpperCase()} · {profile.helmetStyle.toUpperCase()} · {profile.stickStyle.toUpperCase()}</Text>
          </View>
          <Text style={p.caseEdit}>TAP TO EDIT</Text>
        </View>
      </View>

      <View style={p.fields}>
        <View style={p.field}>
          <Text style={p.fieldLabel}>NAME</Text>
          <TextInput accessibilityLabel="Player name" value={profile.name} maxLength={24} placeholder="Player" placeholderTextColor={c.ice600}
            onChangeText={name => onChange({ ...profile, name: name.slice(0, 24) })} style={p.input} />
        </View>
        <View style={[p.field, p.fieldNumber]}>
          <Text style={p.fieldLabel}>NUMBER</Text>
          <TextInput accessibilityLabel="Jersey number" value={String(profile.jerseyNumber)} maxLength={2} keyboardType="number-pad"
            onChangeText={value => onChange({ ...profile, jerseyNumber: Math.max(0, Math.min(99, Number(value.replace(/\D/g, '')) || 0)) })} style={[p.input, p.inputNumber]} />
        </View>
      </View>

      {KINDS.map(kind => {
        const items = COSMETICS.filter(item => item.kind === kind);
        const owned = items.filter(item => isCosmeticUnlocked(item, unlocks)).length;
        return <View key={kind} style={p.section}>
          <View style={p.sectionHead}>
            <Text style={p.sectionTitle}>{labels[kind]}</Text>
            <View style={p.sectionRule} />
            <Text style={p.sectionCount}>{owned} / {items.length}</Text>
          </View>
          <View style={p.grid}>
            {items.map(item => {
              const unlocked = isCosmeticUnlocked(item, unlocks), active = profile[kind] === item.id;
              return <Button key={item.id} disabled={!unlocked} style={[p.tile, active && p.tileActive, !unlocked && p.tileLocked]}
                label={`${item.label}. ${unlocked ? active ? 'Equipped' : 'Owned' : item.requirement?.text ?? 'Locked'}.`}
                onPress={() => choose(kind, item.id)}>
                <Swatch cosmetic={item} kind={kind} jersey={jersey} />
                <Text numberOfLines={1} style={[p.tileName, !unlocked && p.dim]}>{item.label}</Text>
                <Text numberOfLines={1} style={[p.tileState, active && p.tileStateActive, !unlocked && p.tileStateLocked]}>
                  {active ? 'EQUIPPED' : unlocked ? 'OWNED' : unlockLabel(item)}
                </Text>
              </Button>;
            })}
          </View>
        </View>;
      })}
      <Text style={p.foot}>Cosmetics unlock through your career and medals. No currency, no store.</Text>
    </ScrollView>
  </View>;
}

export function AchievementsScreen({ state, progress, onBack }: { state: AchievementState; progress: Progress; onBack: () => void }) {
  const done = completedAchievementCount(state);
  const stars = totalStars(progress);
  return <View style={s.root}>
    <Band colors={['#0D2130', '#091B27', c.ink]} />
    <ScrollView contentContainerStyle={p.page} showsVerticalScrollIndicator={false}>
      <Rise style={p.top}>
        <Button style={s.chromeSquare} label="Back to the map" onPress={onBack}><Text style={s.chromeGlyph}>‹</Text></Button>
        <View style={p.topCopy}>
          <Text style={p.kicker}>CAREER MILESTONES</Text>
          <Text style={s.screenTitle}>MEDALS</Text>
        </View>
        <Text style={p.medalCount}>{done}<Text style={p.medalCountOf}>/{ACHIEVEMENTS.length}</Text></Text>
      </Rise>

      <View style={p.meter}><View style={[p.meterFill, { width: `${done / ACHIEVEMENTS.length * 100}%` }]} /></View>

      <View style={p.medalGrid}>
        {ACHIEVEMENTS.map((achievement, index) => {
          const complete = !!state.completed[achievement.id];
          const reward = achievement.cosmeticReward && COSMETICS.find(item => item.id === achievement.cosmeticReward);
          return <Rise key={achievement.id} delay={Math.min(index * 25, 250)} style={p.medalSlot}>
            <View style={[p.medal, complete && p.medalEarned]}>
              {complete && <Band colors={[c.goldTile, '#1A1F1A', c.goldTileEnd]} />}
              <View style={[p.medalDisc, complete && p.medalDiscEarned]}>
                {complete && <Band colors={[c.goldLight, '#F2B93B', c.goldDark]} />}
                <Text style={[p.medalGlyph, !complete && p.medalGlyphLocked]}>★</Text>
              </View>
              <View>
                <Text style={[p.medalTitle, !complete && p.dim]}>{achievement.title}</Text>
                <Text style={[p.medalBody, !complete && p.medalBodyLocked]}>{achievement.description}</Text>
                {!!reward && <Text style={p.medalReward}>{complete ? 'UNLOCKED' : 'REWARD'} · {reward.label.toUpperCase()}</Text>}
              </View>
            </View>
          </Rise>;
        })}
      </View>

      <View style={p.stats}>
        <View style={p.stat}><Text style={p.statValue}>{state.stats.goals}</Text><Text style={p.statLabel}>GOALS</Text></View>
        <View style={p.stat}><Text style={p.statValue}>{state.stats.passes}</Text><Text style={p.statLabel}>PASSES</Text></View>
        <View style={p.stat}><Text style={[p.statValue, p.statValueGold]}>{stars}</Text><Text style={p.statLabel}>STARS</Text></View>
      </View>
    </ScrollView>
  </View>;
}

export function AchievementToast({ achievement }: { achievement: AchievementDefinition }) {
  return <View pointerEvents="none" style={p.toast}>
    <Rise style={p.toastInner}>
      <View style={p.toastDisc}><Band colors={[c.goldLight, '#F2B93B', c.goldDark]} /><Text style={p.toastDiscGlyph}>★</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={p.toastKicker}>MEDAL UNLOCKED</Text>
        <Text style={p.toastTitle}>{achievement.title}</Text>
        {!!achievement.cosmeticReward && <Text style={p.toastReward}>NEW LOCKER REWARD</Text>}
      </View>
    </Rise>
  </View>;
}

export const selectedRinkCosmetics = (profile: PlayerProfile) => {
  const findColor = (kind: CosmeticKind, id: string, fallback: string) => COSMETICS.find(item => item.kind === kind && item.id === id)?.color ?? fallback;
  const hex = (value: string) => Number.parseInt(value.replace('#', ''), 16);
  return {
    jersey: hex(findColor('jerseyColor', profile.jerseyColor, '#18DCB6')),
    accent: profile.jerseyStyle === 'heritage' ? 0xffcf5a : 0x9ff5df,
    helmet: hex(findColor('helmetColor', profile.helmetColor, '#FFFFFF')),
    gloves: hex(findColor('gloveColor', profile.gloveColor, '#17191D')),
    stick: profile.stickStyle === 'carbon' ? 0x111820 : 0x8b643f,
    stickStyle: profile.stickStyle,
    jerseyStyle: profile.jerseyStyle === 'stripe' ? 'double-stripe' : profile.jerseyStyle === 'heritage' ? 'split' : 'classic',
    helmetStyle: profile.helmetStyle,
  };
};

const p = StyleSheet.create({
  page: { paddingHorizontal: 18, paddingTop: 54, paddingBottom: 40, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  topCopy: { flex: 1 },
  kicker: { ...t.eyebrow, color: c.teal, letterSpacing: 2.6 },
  medalCount: { fontFamily: fonts.numeral, fontSize: 17, color: c.gold },
  medalCountOf: { color: c.lockedDeep },

  case: { height: 322, borderRadius: radii.panel, overflow: 'hidden', borderWidth: 1, borderColor: c.surfaceBorderStrong, alignItems: 'center' },
  caseRing: { position: 'absolute', width: 210, height: 210, borderRadius: 105, top: 22, borderWidth: 2, borderColor: 'rgba(180,235,235,0.14)' },
  caseCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: 'rgba(4,16,26,0.88)', flexDirection: 'row', alignItems: 'center' },
  caseName: { fontFamily: fonts.display, fontSize: 16, color: c.ice100 },
  caseKit: { ...t.eyebrow, color: c.teal, letterSpacing: 1.6, marginTop: 3 },
  caseEdit: { fontFamily: fonts.numeralLight, fontSize: 10, color: '#6F93A6' },

  // Figure geometry is carried over unchanged from the original locker.
  avatar: { width: 190, height: 240, alignItems: 'center', marginTop: 22 },
  head: { width: 58, height: 55, marginTop: 4, zIndex: 5, backgroundColor: '#c78f68', borderRadius: 24, borderWidth: 2, borderColor: c.ink },
  avatarHelmet: { position: 'absolute', left: -3, top: -4, width: 60, height: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 2, borderColor: c.ink },
  helmetEar: { position: 'absolute', right: -5, top: 20, width: 17, height: 21, borderRadius: 7, borderWidth: 2, borderColor: c.ink },
  helmetVisor: { position: 'absolute', left: 4, top: 24, width: 50, height: 18, borderRadius: 6, borderWidth: 2, borderColor: '#63ddeb', backgroundColor: '#baf8ffbb', transform: [{ skewX: '-8deg' }] },
  helmetCage: { position: 'absolute', left: 6, top: 21, width: 43, height: 38, borderWidth: 2, borderColor: '#d8f3f5', borderRadius: 5, backgroundColor: '#24445755' },
  cageBar: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#e7f7f8' },
  cageCross: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#e7f7f8' },
  avatarBody: { position: 'absolute', top: 57, width: 100, height: 102, borderRadius: 17, borderWidth: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 3 },
  avatarNumber: { fontFamily: fonts.display, fontSize: 39, zIndex: 4 },
  jerseyBand: { position: 'absolute', left: 0, right: 0, height: 12, top: 17 },
  jerseyBandHigh: { height: 8, top: 14 }, jerseyBandLow: { height: 8, top: 31 },
  jerseySplit: { position: 'absolute', width: 22, top: 0, bottom: 0, right: 13, transform: [{ skewX: '-8deg' }] },
  arm: { position: 'absolute', top: 72, width: 31, height: 89, borderRadius: 13, borderWidth: 3, borderColor: c.ink, zIndex: 2 },
  armLeft: { left: 26, transform: [{ rotate: '12deg' }] }, armRight: { right: 26, transform: [{ rotate: '-12deg' }] },
  glove: { position: 'absolute', left: 1, right: 1, bottom: -8, height: 28, borderRadius: 8, borderWidth: 2, borderColor: c.ink },
  leg: { position: 'absolute', top: 151, width: 34, height: 65, borderRadius: 8, backgroundColor: '#16333f', zIndex: 1 },
  legLeft: { left: 57, transform: [{ rotate: '4deg' }] }, legRight: { right: 57, transform: [{ rotate: '-4deg' }] },
  skate: { position: 'absolute', left: -6, bottom: -4, width: 46, height: 13, borderRadius: 5, backgroundColor: '#091520', borderBottomWidth: 2, borderBottomColor: '#91aab4' },
  avatarStick: { position: 'absolute', right: 12, top: 65, width: 8, height: 157, borderRadius: 3, transform: [{ rotate: '13deg' }], borderWidth: 1, borderColor: c.ink, zIndex: 6 },
  carbonStick: { width: 10 },
  stickBlade: { position: 'absolute', right: -4, bottom: -5, width: 42, height: 13, borderRadius: 4, transform: [{ rotate: '-9deg' }], borderWidth: 1, borderColor: c.ink },
  stickTape: { position: 'absolute', top: 5, left: -2, width: 12, height: 30, borderRadius: 3, backgroundColor: c.gold },

  fields: { flexDirection: 'row', gap: 9 },
  field: { flex: 1, paddingVertical: 11, paddingHorizontal: 13, borderRadius: radii.chip, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
  fieldNumber: { flex: 0, width: 108 },
  fieldLabel: { ...t.eyebrow, color: c.ice600, letterSpacing: 1.4 },
  input: { marginTop: 2, minHeight: 28, padding: 0, color: c.ice100, fontFamily: fonts.display, fontSize: 15 },
  inputNumber: { fontFamily: fonts.numeral },

  section: { gap: 9 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  sectionTitle: { ...t.eyebrow, color: c.gold, letterSpacing: 2.6 },
  sectionRule: { flex: 1, height: 1, backgroundColor: c.surfaceBorder },
  sectionCount: { fontFamily: fonts.numeralLight, fontSize: 10, color: c.ice600 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  tile: { width: '31.5%', minHeight: 96, paddingVertical: 12, paddingHorizontal: 10, borderRadius: radii.chip, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, gap: 8 },
  tileActive: { backgroundColor: c.tealDeep, borderWidth: 2, borderColor: c.teal },
  tileLocked: { borderStyle: 'dashed', borderColor: c.dashedBorder, opacity: 0.55 },
  tileName: { fontFamily: fonts.display, fontSize: 11, color: c.ice200 },
  tileState: { fontFamily: fonts.label, fontSize: 8, letterSpacing: 1.2, color: c.ice600 },
  tileStateActive: { color: c.teal },
  tileStateLocked: { color: c.gold },
  dim: { color: c.lockedDim },
  swatch: { height: 34, borderRadius: 7, backgroundColor: c.surfaceBorder },
  swatchBox: { height: 34, borderRadius: 7, backgroundColor: c.meterTrack, alignItems: 'center', justifyContent: 'center' },
  swatchStripe: { position: 'absolute', left: 0, right: 0, height: 5, backgroundColor: '#EAF6FA' },
  swatchSplit: { position: 'absolute', top: 0, bottom: 0, right: 8, width: 12, backgroundColor: c.gold, transform: [{ skewX: '-8deg' }] },
  helmetSwatch: { width: 26, height: 18, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: c.ice200 },
  helmetSwatchCage: { position: 'absolute', bottom: 6, width: 20, height: 8, borderWidth: 1, borderColor: c.ink, backgroundColor: '#24445766' },
  helmetSwatchVisor: { position: 'absolute', bottom: 8, width: 22, height: 6, borderRadius: 3, backgroundColor: '#baf8ffcc' },
  stickSwatch: { width: 26, height: 6, borderRadius: 3 },
  foot: { ...t.body, color: c.ice500, textAlign: 'center', lineHeight: 17, marginTop: 4 },

  meter: { height: 6, borderRadius: 3, backgroundColor: c.meterTrack, overflow: 'hidden' },
  meterFill: { height: 6, backgroundColor: c.gold },
  medalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  medalSlot: { width: '48.4%' },
  medal: { flex: 1, padding: 14, borderRadius: radii.card, overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, gap: 10 },
  medalEarned: { borderColor: c.goldBorder, backgroundColor: 'transparent' },
  medalDisc: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: c.meterTrack, alignItems: 'center', justifyContent: 'center' },
  medalDiscEarned: { backgroundColor: 'transparent' },
  medalGlyph: { fontSize: 19, lineHeight: 23, color: c.ink },
  medalGlyphLocked: { color: c.ice700, fontSize: 17 },
  medalTitle: { fontFamily: fonts.display, fontSize: 14, color: c.ice100 },
  medalBody: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, letterSpacing: 0.3, color: c.locked, marginTop: 3 },
  medalBodyLocked: { color: c.ice500 },
  medalReward: { fontFamily: fonts.label, fontSize: 8, letterSpacing: 1.3, color: c.gold, marginTop: 7 },

  stats: { flexDirection: 'row', gap: 9, marginTop: 4 },
  stat: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radii.chip, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder },
  statValue: { fontFamily: fonts.numeral, fontSize: 17, color: c.ice100 },
  statValueGold: { color: c.gold },
  statLabel: { ...t.eyebrow, color: c.ice600, letterSpacing: 1.3, marginTop: 2 },

  toast: { position: 'absolute', zIndex: 20, top: 104, left: 18, right: 18 },
  toastInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: radii.card, backgroundColor: 'rgba(6,21,32,0.92)', borderWidth: 1, borderColor: c.goldBorder },
  toastDisc: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  toastDiscGlyph: { fontSize: 17, lineHeight: 21, color: c.ink },
  toastKicker: { ...t.eyebrow, color: c.teal, letterSpacing: 1.3 },
  toastTitle: { fontFamily: fonts.display, fontSize: 16, color: c.ice100, marginTop: 2 },
  toastReward: { fontFamily: fonts.label, fontSize: 8, letterSpacing: 1.3, color: c.gold, marginTop: 3 },
});
