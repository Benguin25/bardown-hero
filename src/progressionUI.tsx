import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ACHIEVEMENTS, completedAchievementCount, type AchievementDefinition, type AchievementState } from './achievements';
import { CAREER_STAGES, chapterIndex, isChapterComplete, isChapterPerfect, totalStars } from './career';
import { CHAPTERS } from './content';
import { COSMETICS, isCosmeticUnlocked, type CosmeticKind, type PlayerProfile } from './profile';
import type { Progress } from './progress';
import { Button, Rise, s } from './ui';

const labels: Record<CosmeticKind, string> = {
  jerseyStyle: 'JERSEY STYLE', jerseyColor: 'JERSEY COLOR', helmetStyle: 'HELMET',
  helmetColor: 'HELMET COLOR', gloveColor: 'GLOVES', stickStyle: 'STICK',
};

function LockerAvatar({ profile, jersey, helmet, gloves, stick }: {
  profile: PlayerProfile; jersey: string; helmet: string; gloves: string; stick: string;
}) {
  const numberColor = profile.jerseyColor === 'ember' ? '#ffffff' : '#071624';
  const accent = profile.jerseyStyle === 'heritage' ? '#ffcf5a' : '#9ff5df';
  return <View style={p.previewRink} accessibilityLabel={`Uniform preview. ${profile.jerseyStyle} jersey, ${profile.helmetStyle} helmet, ${profile.stickStyle} stick.`}>
    <View style={p.previewGlow} />
    <View style={p.avatar}>
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
    </View>
    <View style={p.previewCaption}><Text style={p.previewName}>#{profile.jerseyNumber} {profile.name || 'PLAYER'}</Text><Text style={p.previewKit}>{profile.jerseyStyle.toUpperCase()} · {profile.helmetStyle.toUpperCase()} · {profile.stickStyle.toUpperCase()}</Text></View>
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
  const chosen = (kind: CosmeticKind) => profile[kind];
  const choose = (kind: CosmeticKind, id: string) => onChange({ ...profile, [kind]: id });
  const color = (kind: CosmeticKind, id: string) => COSMETICS.find(item => item.kind === kind && item.id === id)?.color;
  const jersey = color('jerseyColor', profile.jerseyColor) ?? '#F4FAFF';
  const helmet = color('helmetColor', profile.helmetColor) ?? '#FFFFFF';
  const gloves = color('gloveColor', profile.gloveColor) ?? '#17191D';
  const stick = profile.stickStyle === 'carbon' ? '#111820' : '#8B643F';
  return <ScrollView contentContainerStyle={p.page} keyboardShouldPersistTaps="handled">
    <Rise><View style={p.top}><Button style={s.navButton} label="Back to career" onPress={onBack}><Text style={s.navGlyph}>‹</Text></Button><View style={{ flex: 1 }}><Text style={p.kicker}>PROFILE / LOCKER</Text><Text style={p.title}>MAKE IT YOURS.</Text></View></View></Rise>
    <View style={p.identityCard}>
      <LockerAvatar profile={profile} jersey={jersey} helmet={helmet} gloves={gloves} stick={stick} />
      <View style={p.identityFields}>
        <Text style={p.fieldLabel}>PLAYER NAME</Text>
        <TextInput accessibilityLabel="Player name" value={profile.name} maxLength={24} onChangeText={name => onChange({ ...profile, name: name.slice(0, 24) })} placeholder="Player" placeholderTextColor="#708a98" style={p.input} />
        <Text style={p.fieldLabel}>JERSEY NUMBER</Text>
        <TextInput accessibilityLabel="Jersey number" value={String(profile.jerseyNumber)} maxLength={2} keyboardType="number-pad" onChangeText={value => onChange({ ...profile, jerseyNumber: Math.max(0, Math.min(99, Number(value.replace(/\D/g, '')) || 0)) })} style={p.input} />
      </View>
    </View>
    {(Object.keys(labels) as CosmeticKind[]).map(kind => <View key={kind} style={p.section}>
      <Text style={p.sectionTitle}>{labels[kind]}</Text>
      <View style={p.optionGrid}>{COSMETICS.filter(item => item.kind === kind).map(item => {
        const unlocked = isCosmeticUnlocked(item, unlocks), active = chosen(kind) === item.id;
        return <Button key={item.id} disabled={!unlocked} label={`${item.label}. ${unlocked ? active ? 'Equipped' : 'Unlocked' : item.requirement?.text ?? 'Locked'}.`}
          onPress={() => choose(kind, item.id)} style={[p.option, active && p.optionActive, !unlocked && p.optionLocked]}>
          {!!item.color && <View style={[p.swatch, { backgroundColor: item.color }]} />}
          <View style={{ flex: 1 }}><Text style={[p.optionName, !unlocked && p.dim]}>{item.label}</Text><Text style={p.optionState}>{active ? 'EQUIPPED' : unlocked ? 'AVAILABLE' : `LOCKED · ${item.requirement?.text}`}</Text></View>
        </Button>;
      })}</View>
    </View>)}
    <Text style={p.foot}>Cosmetics unlock through your career and achievements. No currency, no store.</Text>
  </ScrollView>;
}

export function AchievementsScreen({ state, onBack }: { state: AchievementState; onBack: () => void }) {
  const done = completedAchievementCount(state);
  return <ScrollView contentContainerStyle={p.page}>
    <Rise><View style={p.top}><Button style={s.navButton} label="Back to career" onPress={onBack}><Text style={s.navGlyph}>‹</Text></Button><View style={{ flex: 1 }}><Text style={p.kicker}>CAREER MILESTONES</Text><Text style={p.title}>ACHIEVEMENTS</Text><Text style={p.subtitle}>{done} / {ACHIEVEMENTS.length} COMPLETE · {state.stats.goals} GOALS · {state.stats.passes} PASSES</Text></View></View></Rise>
    <View style={p.achievementMeter}><View style={[p.achievementFill, { width: `${done / ACHIEVEMENTS.length * 100}%` }]} /></View>
    {ACHIEVEMENTS.map((achievement, index) => {
      const complete = !!state.completed[achievement.id];
      const reward = achievement.cosmeticReward && COSMETICS.find(item => item.id === achievement.cosmeticReward);
      return <Rise key={achievement.id} delay={Math.min(index * 25, 250)}><View style={[p.achievement, complete && p.achievementDone]}>
        <View style={[p.medal, complete && p.medalDone]}><Text style={p.medalText}>{complete ? '✓' : '•'}</Text></View>
        <View style={{ flex: 1 }}><Text style={[p.achievementName, !complete && p.dim]}>{achievement.title}</Text><Text style={p.achievementDescription}>{achievement.description}</Text>{reward && <Text style={p.reward}>{complete ? 'UNLOCKED' : 'REWARD'} · {reward.label}</Text>}</View>
      </View></Rise>;
    })}
  </ScrollView>;
}

export function AchievementToast({ achievement }: { achievement: AchievementDefinition }) {
  return <View pointerEvents="none" style={p.toast}><Rise style={{ alignItems: 'center' }}><Text style={p.toastKicker}>ACHIEVEMENT UNLOCKED</Text><Text style={p.toastTitle}>{achievement.title}</Text>{achievement.cosmeticReward && <Text style={p.toastReward}>NEW LOCKER REWARD</Text>}</Rise></View>;
}

export function ChapterComplete({ chapter, rewards }: { chapter: number; rewards: string[] }) {
  const stage = CAREER_STAGES.find(item => item.chapters.includes(chapter));
  return <View style={p.chapterComplete}><Text style={p.chapterKicker}>{stage?.label.toUpperCase()} MILESTONE</Text><Text style={p.chapterTitle}>CHAPTER COMPLETE</Text><Text style={p.chapterName}>{CHAPTERS[chapter]}</Text><Text style={p.chapterTrophy}>★ TROPHY EARNED</Text>{rewards.map(reward => <Text key={reward} style={p.reward}>LOCKER UNLOCK · {reward}</Text>)}</View>;
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
  page: { padding: 18, paddingBottom: 36, gap: 16, backgroundColor: '#071624' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 }, kicker: { color: '#23dcb6', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 },
  title: { color: '#f1f8fa', fontSize: 29, fontWeight: '900', fontStyle: 'italic' }, subtitle: { color: '#91aaba', fontSize: 11, fontWeight: '700', marginTop: 4 },
  identityCard: { gap: 14, borderRadius: 18, backgroundColor: '#102b3d', borderWidth: 1, borderColor: '#315062', padding: 14 }, identityFields: { gap: 8 },
  previewRink: { height: 285, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: '#3a5d6d', backgroundColor: '#d8edf0', alignItems: 'center' }, previewGlow: { position: 'absolute', width: 230, height: 230, borderRadius: 115, top: 8, backgroundColor: '#b5e2e2', opacity: 0.7 },
  avatar: { width: 190, height: 230, alignItems: 'center', marginTop: 8 }, head: { width: 58, height: 55, marginTop: 4, zIndex: 5, backgroundColor: '#c78f68', borderRadius: 24, borderWidth: 2, borderColor: '#173143' },
  avatarHelmet: { position: 'absolute', left: -3, top: -4, width: 60, height: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 2, borderColor: '#173143' }, helmetEar: { position: 'absolute', right: -5, top: 20, width: 17, height: 21, borderRadius: 7, borderWidth: 2, borderColor: '#173143' },
  helmetVisor: { position: 'absolute', left: 4, top: 24, width: 50, height: 18, borderRadius: 6, borderWidth: 2, borderColor: '#63ddeb', backgroundColor: '#baf8ffbb', transform: [{ skewX: '-8deg' }] }, helmetCage: { position: 'absolute', left: 6, top: 21, width: 43, height: 38, borderWidth: 2, borderColor: '#d8f3f5', borderRadius: 5, backgroundColor: '#24445755' }, cageBar: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#e7f7f8' }, cageCross: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#e7f7f8' },
  avatarBody: { position: 'absolute', top: 57, width: 100, height: 102, borderRadius: 17, borderWidth: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 3 }, avatarNumber: { fontSize: 39, fontWeight: '900', zIndex: 4 }, jerseyBand: { position: 'absolute', left: 0, right: 0, height: 12, top: 17 }, jerseyBandHigh: { height: 8, top: 14 }, jerseyBandLow: { height: 8, top: 31 }, jerseySplit: { position: 'absolute', width: 22, top: 0, bottom: 0, right: 13, transform: [{ skewX: '-8deg' }] },
  arm: { position: 'absolute', top: 72, width: 31, height: 89, borderRadius: 13, borderWidth: 3, borderColor: '#173143', zIndex: 2 }, armLeft: { left: 26, transform: [{ rotate: '12deg' }] }, armRight: { right: 26, transform: [{ rotate: '-12deg' }] }, glove: { position: 'absolute', left: 1, right: 1, bottom: -8, height: 28, borderRadius: 8, borderWidth: 2, borderColor: '#173143' },
  leg: { position: 'absolute', top: 151, width: 34, height: 65, borderRadius: 8, backgroundColor: '#173143', zIndex: 1 }, legLeft: { left: 57, transform: [{ rotate: '4deg' }] }, legRight: { right: 57, transform: [{ rotate: '-4deg' }] }, skate: { position: 'absolute', left: -6, bottom: -4, width: 46, height: 13, borderRadius: 5, backgroundColor: '#09151e', borderBottomWidth: 2, borderBottomColor: '#91aab4' },
  avatarStick: { position: 'absolute', right: 12, top: 65, width: 8, height: 157, borderRadius: 3, transform: [{ rotate: '13deg' }], borderWidth: 1, borderColor: '#173143', zIndex: 6 }, carbonStick: { width: 10 }, stickBlade: { position: 'absolute', right: -4, bottom: -5, width: 42, height: 13, borderRadius: 4, transform: [{ rotate: '-9deg' }], borderWidth: 1, borderColor: '#173143' }, stickTape: { position: 'absolute', top: 5, left: -2, width: 12, height: 30, borderRadius: 3, backgroundColor: '#ffcf5a' },
  previewCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 54, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#071624e8', alignItems: 'center', justifyContent: 'center' }, previewName: { color: '#f1f8fa', fontSize: 16, fontWeight: '900' }, previewKit: { color: '#23dcb6', fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 3 },
  fieldLabel: { color: '#8fa8b5', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, input: { minHeight: 42, color: '#f1f8fa', backgroundColor: '#071c2b', borderWidth: 1, borderColor: '#355365', borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: '800' },
  section: { gap: 9 }, sectionTitle: { color: '#ffcf5a', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 }, optionGrid: { gap: 7 },
  option: { minHeight: 53, padding: 10, borderRadius: 12, backgroundColor: '#10283a', borderWidth: 1, borderColor: '#294354', flexDirection: 'row', alignItems: 'center', gap: 10 }, optionActive: { borderColor: '#23dcb6', backgroundColor: '#123b3d', borderWidth: 2 }, optionLocked: { opacity: 0.58 },
  swatch: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#8aa4b1' }, optionName: { color: '#eff8fa', fontSize: 14, fontWeight: '900' }, optionState: { color: '#88a5b3', fontSize: 9, fontWeight: '800', marginTop: 3 }, dim: { color: '#718996' }, foot: { color: '#819ba8', textAlign: 'center', fontSize: 11, lineHeight: 16 },
  achievementMeter: { height: 6, backgroundColor: '#1b3446', borderRadius: 3, overflow: 'hidden' }, achievementFill: { height: 6, backgroundColor: '#ffcf5a' },
  achievement: { flexDirection: 'row', gap: 12, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: '#243d4e', backgroundColor: '#0d2232' }, achievementDone: { borderColor: '#22665b', backgroundColor: '#102e33' },
  medal: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a3345' }, medalDone: { backgroundColor: '#ffcf5a' }, medalText: { color: '#071624', fontSize: 20, fontWeight: '900' }, achievementName: { color: '#f1f8fa', fontWeight: '900', fontSize: 15 }, achievementDescription: { color: '#9db5c1', fontSize: 12, lineHeight: 16, marginTop: 2 }, reward: { color: '#ffcf5a', fontSize: 10, fontWeight: '900', marginTop: 5, letterSpacing: 0.7 },
  toast: { position: 'absolute', zIndex: 20, top: 64, left: 24, right: 24, padding: 13, borderRadius: 13, backgroundColor: '#0c2c35f5', borderColor: '#ffcf5a', borderWidth: 1, alignItems: 'center' }, toastKicker: { color: '#23dcb6', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, toastTitle: { color: '#fff4cd', fontSize: 18, fontWeight: '900', marginTop: 2 }, toastReward: { color: '#ffcf5a', fontSize: 9, fontWeight: '800', marginTop: 3 },
  chapterComplete: { alignSelf: 'stretch', backgroundColor: '#15383a', borderWidth: 1, borderColor: '#ffcf5a', borderRadius: 15, padding: 15, alignItems: 'center', marginVertical: 5 }, chapterKicker: { color: '#23dcb6', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, chapterTitle: { color: '#ffcf5a', fontSize: 23, fontWeight: '900', fontStyle: 'italic', marginTop: 3 }, chapterName: { color: '#ecf7f9', fontSize: 13, fontWeight: '800', marginTop: 2 }, chapterTrophy: { color: '#ffcf5a', fontSize: 11, fontWeight: '900', marginTop: 8 },
});
