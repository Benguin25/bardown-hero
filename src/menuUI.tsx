import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AchievementState } from './achievements';
import { HIGHLIGHTS, LEVELS, OBJECTIVE_SHORT } from './content';
import type { Progress } from './progress';
import { SHOP_ITEMS, puckBalance, type ShopItem, type ShopState } from './store';
import { TOTAL_STARS, VENUES, currentLevel, sealedVenue, totalStars, venueOfLevel } from './venues';
import { Band, Button, Glow, Rise, Stripes, s } from './ui';
import { c, fonts, radii, shadow } from './theme';

const pad = (value: number) => String(value).padStart(2, '0');

/** The 52x56 bust on the scoreboard jersey tile. Same three shapes as the map. */
function Bust({ number }: { number: number }) {
  return <View pointerEvents="none" style={m.bust}>
    <View style={m.bustFace} /><View style={m.bustHelmet} />
    <View style={m.bustJersey}><Text style={m.bustNumber}>{number}</Text></View>
  </View>;
}

export function HomeScreen({ name, jerseyNumber, pucks, progress, onPlay, onCampaign, onLocker, onShop, onMedals, onHelp, onSettings }: {
  name: string; jerseyNumber: number; pucks: number; progress: Progress;
  onPlay: () => void; onCampaign: () => void; onLocker: () => void; onShop: () => void;
  onMedals: () => void; onHelp: () => void; onSettings: () => void;
}) {
  const earned = totalStars(progress);
  const index = currentLevel(progress);
  const level = LEVELS[index], venue = venueOfLevel(index), sealed = sealedVenue(progress);
  const run = progress.runs[String(index)];
  const gate = sealed ? `${sealed.gateStars} ★ OPENS ${sealed.name}` : 'EVERY VENUE OPEN';
  return <View style={s.root}>
    <Band colors={[c.inkRaised, c.ink, c.ink]} stops={[0, 0.6, 1]} />
    <View pointerEvents="none" style={m.homeGlow}><Glow color={c.gold} opacity={0.12} cx="50%" cy="20%" rx="70%" ry="60%" /></View>

    <View style={m.home}>
      <View style={m.topBar}>
        <Text style={m.wordmark}>BARDOWN <Text style={m.teal}>HERO</Text></Text>
        <View style={m.puckPill}>
          <Text style={m.puckGlyph}>●</Text><Text style={m.puckValue}>{pucks}</Text><Text style={m.puckLabel}>PUCKS</Text>
        </View>
      </View>

      <Rise style={m.board}>
        <View style={m.boardTop}>
          <View style={m.jerseyTile}>
            <Stripes color={c.stripeTeal} angle={135} thickness={2} period={9} />
            <Bust number={jerseyNumber} />
          </View>
          <View style={m.identity}>
            <Text style={m.micro}>WELCOME BACK</Text>
            <Text numberOfLines={1} style={m.playerName}>{name.toUpperCase()}</Text>
            <View style={m.statRow}>
              <View>
                <Text style={m.statGold}>{earned}<Text style={m.statOf}>/{TOTAL_STARS}</Text></Text>
                <Text style={m.statLabel}>STARS</Text>
              </View>
              <View>
                <Text style={m.statPlain}>{pad(venue.order + 1)}<Text style={m.statOf}>/{pad(VENUES.length)}</Text></Text>
                <Text style={m.statLabel}>VENUE</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={m.boardFoot}>
          <View style={m.boardTrack}><View style={[m.boardFill, { width: `${(earned / TOTAL_STARS) * 100}%` }]} /></View>
          <View style={m.boardLabels}>
            <Text style={m.boardLabel}>{venue.name}</Text><Text style={m.boardLabel}>{gate}</Text>
          </View>
        </View>
      </Rise>

      <Text style={m.shiftLabel}>TONIGHT'S SHIFT</Text>
      <View style={m.shift}>
        <View style={m.shiftArt}>
          <Band colors={['#0A1A22', '#0A1D25', '#0B2029']} />
          <Stripes color={c.stripe} angle={105} thickness={2} period={12} />
          <Text style={m.artCaption}>[ VENUE ART — {venue.name} ]</Text>
          <View style={m.shiftBadge}><Text style={m.shiftBadgeText}>{pad(index + 1)}</Text></View>
        </View>
        <View style={m.shiftBody}>
          <Text style={m.shiftEyebrow}>UP NEXT · LEVEL {pad(index + 1)}</Text>
          <Text style={m.shiftTitle}>{level.title}</Text>
          <Text style={m.shiftBlurb}>{HIGHLIGHTS[index]}</Text>
          <View style={m.tiles}>
            {level.objectives.map((objective, slot) => <View key={objective} style={m.tile}>
              <Text style={[m.tileStar, run?.[slot] && m.tileStarEarned]}>{run?.[slot] ? '★' : '☆'}</Text>
              <Text style={m.tileLabel}>{OBJECTIVE_SHORT[objective]}</Text>
            </View>)}
          </View>
          <Button style={m.play} label={`Play level ${index + 1}. ${level.title}.`} onPress={onPlay}>
            <Text style={m.playText}>PLAY</Text><Text style={m.playGlyph}>▶</Text>
          </Button>
        </View>
      </View>

      <View style={m.menu}>
        <Button style={m.campaign} label="Open the campaign" onPress={onCampaign}>
          <Text style={m.campaignText}>CAMPAIGN</Text>
          <Text style={m.campaignSub}>VENUE {pad(venue.order + 1)} · {venue.count} LEVELS ›</Text>
        </Button>
        <View style={m.menuRow}>
          <Button style={m.menuButton} onPress={onLocker}><Text style={m.menuText}>LOCKER</Text></Button>
          <Button style={m.menuButton} onPress={onShop}><Text style={m.menuText}>SHOP</Text></Button>
          <Button style={m.menuButton} onPress={onMedals}><Text style={m.menuText}>MEDALS</Text></Button>
        </View>
        <View style={m.menuRow}>
          <Button style={m.quietButton} onPress={onHelp}><Text style={m.quietText}>HOW TO PLAY</Text></Button>
          <Button style={m.quietButton} onPress={onSettings}><Text style={m.quietText}>SETTINGS</Text></Button>
        </View>
      </View>
    </View>
  </View>;
}

export function SettingsScreen({ soundOn, onToggleSound, onBack }: { soundOn: boolean; onToggleSound: () => void; onBack: () => void }) {
  return <SafeAreaView style={s.root}><View style={m.settingsPage}>
    <Band colors={['#0C2C39', '#071F2D', c.ink]} /><Glow color={c.teal} opacity={0.12} cy="12%" />
    <View style={m.shopHead}><Button style={s.chromeSquare} label="Back" onPress={onBack}><Text style={s.chromeGlyph}>‹</Text></Button><View><Text style={m.kicker}>GAME OPTIONS</Text><Text style={m.shopTitle}>SETTINGS</Text></View></View>
    <View style={m.settingCard}>
      <View style={m.settingCopy}><Text style={m.settingTitle}>MUSIC & SOUND</Text><Text style={m.settingBody}>Background music, rink sounds, and gameplay cues.</Text></View>
      <Button style={[m.toggle, soundOn && m.toggleOn]} label={`Music ${soundOn ? 'on' : 'off'}`} onPress={onToggleSound}><Text style={[m.toggleText, soundOn && m.toggleTextOn]}>{soundOn ? 'ON' : 'OFF'}</Text></Button>
    </View>
    <Text style={m.settingsNote}>Your preference is saved automatically.</Text>
  </View></SafeAreaView>;
}

export function ShopScreen({ state, progress, achievements, onBuy, onBack }: {
  state: ShopState; progress: Progress; achievements: AchievementState; onBuy: (item: ShopItem) => boolean; onBack: () => void;
}) {
  const balance = puckBalance(state, progress, achievements);
  const [notice, setNotice] = useState('');
  return <SafeAreaView style={s.root}><ScrollView contentContainerStyle={m.shopPage} showsVerticalScrollIndicator={false}>
    <View style={m.shopHead}><Button style={s.chromeSquare} onPress={onBack}><Text style={s.chromeGlyph}>‹</Text></Button><View style={{ flex: 1 }}><Text style={m.kicker}>GEAR UP</Text><Text style={m.shopTitle}>THE SHOP</Text></View><View style={m.balanceSmall}><Text style={m.shopPuck}>●</Text><Text style={m.balanceValue}>{balance}</Text></View></View>
    <Text style={m.shopIntro}>Earn 50 Pucks per star and 100 per achievement. Real-money prices are previews only.</Text>
    {!!notice && <Text style={m.notice}>{notice}</Text>}
    {SHOP_ITEMS.map((item, index) => {
      const owned = state.owned.includes(item.cosmeticId), affordable = balance >= item.puckPrice;
      return <Rise key={item.id} delay={index * 45}><View style={m.item}>
        <View style={[m.itemArt, item.color ? { backgroundColor: item.color } : m.carbon]}><Text style={m.itemGlyph}>{item.kind === 'stickStyle' ? '╱' : '★'}</Text></View>
        <View style={m.itemCopy}><Text style={m.itemKind}>{item.kind.replace(/([A-Z])/g, ' $1').toUpperCase()}</Text><Text style={m.itemName}>{item.label}</Text><Text style={m.cash}>{item.cashLabel} · PURCHASES COMING SOON</Text></View>
        <Button disabled={owned} style={[m.buy, owned && m.owned, !owned && !affordable && m.unaffordable]} onPress={() => setNotice(onBuy(item) ? `${item.label.toUpperCase()} ADDED TO YOUR LOCKER` : 'EARN MORE PUCKS TO UNLOCK THIS ITEM')}>
          <Text style={m.buyText}>{owned ? 'OWNED' : `${item.puckPrice} ●`}</Text>
        </Button>
      </View></Rise>;
    })}
    <View style={m.careerBox}><Text style={m.itemKind}>CAREER COLLECTION</Text><Text style={m.itemName}>Earned gear stays earned.</Text><Text style={m.shopIntro}>Star, chapter, and achievement rewards appear in your Locker and cannot be bought.</Text></View>
  </ScrollView></SafeAreaView>;
}

const m = StyleSheet.create({
  // Home (3a). The root is a flex column and the menu block is pinned with
  // marginTop:auto — that slack is what keeps the buttons off the shift card
  // on short devices. Do not convert the block to absolute positioning.
  home: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingTop: 50, paddingHorizontal: 18, paddingBottom: 34, flexDirection: 'column' },
  homeGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: 470 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { color: c.ice100, fontFamily: fonts.displayItalic, fontSize: 21, letterSpacing: -0.9 },
  teal: { color: c.teal },
  puckPill: { height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: c.chromeSolid, borderWidth: 1, borderColor: c.glassBorder, flexDirection: 'row', alignItems: 'center', gap: 6 },
  puckGlyph: { color: c.gold, fontSize: 10 },
  puckValue: { color: c.gold, fontFamily: fonts.numeral, fontSize: 12 },
  puckLabel: { color: c.ice600, fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.2 },

  board: { marginTop: 20, borderRadius: 22, overflow: 'hidden', backgroundColor: c.inkRaised, borderWidth: 1, borderColor: c.surfaceBorderStrong, ...shadow.card },
  boardTop: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', gap: 15, alignItems: 'center' },
  jerseyTile: { width: 72, height: 84, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  bust: { width: 52, height: 56, marginBottom: 7 },
  bustFace: { position: 'absolute', left: 14, top: 2, width: 24, height: 22, borderRadius: 9, backgroundColor: c.skin, borderWidth: 2, borderColor: c.ink },
  bustHelmet: { position: 'absolute', left: 12, top: -1, width: 28, height: 14, backgroundColor: c.ice200, borderWidth: 2, borderColor: c.ink, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  bustJersey: { position: 'absolute', left: 10, top: 22, width: 32, height: 28, borderRadius: 8, backgroundColor: c.teal, borderWidth: 2, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  bustNumber: { color: c.ink, fontFamily: fonts.display, fontSize: 11 },
  identity: { flex: 1 },
  micro: { color: c.ice600, fontFamily: fonts.label, fontSize: 9, letterSpacing: 2.4 },
  playerName: { marginTop: 3, color: c.ice100, fontFamily: fonts.displayItalic, fontSize: 28, lineHeight: 27, letterSpacing: -1.3 },
  statRow: { marginTop: 9, flexDirection: 'row', gap: 18 },
  statGold: { color: c.gold, fontFamily: fonts.numeral, fontSize: 16 },
  statPlain: { color: c.ice200, fontFamily: fonts.numeral, fontSize: 16 },
  statOf: { color: c.ice600, fontSize: 11 },
  statLabel: { color: c.ice600, fontFamily: fonts.label, fontSize: 8, letterSpacing: 1.6 },
  boardFoot: { paddingHorizontal: 16, paddingBottom: 14 },
  boardTrack: { height: 4, borderRadius: 2, backgroundColor: c.meterTrack, overflow: 'hidden' },
  boardFill: { height: 4, backgroundColor: c.gold },
  boardLabels: { marginTop: 7, flexDirection: 'row', justifyContent: 'space-between' },
  boardLabel: { color: c.ice600, fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.4 },

  shiftLabel: { marginTop: 22, color: c.ice600, fontFamily: fonts.label, fontSize: 9, letterSpacing: 2.6 },
  shift: { marginTop: 9, borderRadius: 20, overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorderStrong },
  shiftArt: { height: 84, overflow: 'hidden' },
  artCaption: { position: 'absolute', left: 14, bottom: 11, color: c.ice500, fontFamily: fonts.numeralLight, fontSize: 9, letterSpacing: 1 },
  shiftBadge: { position: 'absolute', right: 14, top: 13, width: 36, height: 36, borderRadius: 18, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  shiftBadgeText: { color: c.ink, fontFamily: fonts.numeral, fontSize: 13 },
  shiftBody: { padding: 15 },
  shiftEyebrow: { color: c.teal, fontFamily: fonts.label, fontSize: 9, letterSpacing: 2.4 },
  shiftTitle: { marginTop: 5, color: c.ice100, fontFamily: fonts.displayItalic, fontSize: 25, lineHeight: 24, letterSpacing: -1.1 },
  shiftBlurb: { marginTop: 7, color: c.ice400, fontFamily: fonts.body, fontSize: 13, letterSpacing: 0.4 },
  tiles: { marginTop: 13, flexDirection: 'row', gap: 8 },
  tile: { flex: 1, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, alignItems: 'center' },
  tileStar: { color: c.ice700, fontSize: 14 },
  tileStarEarned: { color: c.gold },
  tileLabel: { marginTop: 3, color: c.ice400, fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.1, textAlign: 'center' },
  play: { marginTop: 14, height: 58, borderRadius: 15, backgroundColor: c.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  playText: { color: c.ink, fontFamily: fonts.displayItalic, fontSize: 24, letterSpacing: -0.7 },
  playGlyph: { color: c.ink, fontSize: 19 },

  menu: { marginTop: 'auto', paddingTop: 22, flexDirection: 'column', gap: 8 },
  campaign: { height: 50, borderRadius: 14, backgroundColor: c.goldWash, borderWidth: 1, borderColor: c.goldWashBorderUp, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  campaignText: { color: c.gold, fontFamily: fonts.label, fontSize: 13, letterSpacing: 1.4 },
  campaignSub: { color: c.goldQuiet, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.2 },
  menuRow: { flexDirection: 'row', gap: 8 },
  menuButton: { flex: 1, height: 48, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorderStrong, alignItems: 'center', justifyContent: 'center' },
  menuText: { color: c.ice200, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1.2 },
  quietButton: { flex: 1, height: 44, borderRadius: 14, backgroundColor: c.glassSoft, borderWidth: 1, borderColor: c.chromeBorder, alignItems: 'center', justifyContent: 'center' },
  quietText: { color: c.ice300, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2 },

  kicker: { color: c.teal, fontFamily: fonts.label, fontSize: 10, letterSpacing: 2.2 },
  shopPuck: { color: c.gold, fontSize: 13 },
  balanceSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, height: 36, borderRadius: 18, backgroundColor: c.surface }, balanceValue: { color: c.gold, fontFamily: fonts.numeral, fontSize: 16 },
  shopPage: { padding: 18, paddingBottom: 42, gap: 12 }, shopHead: { flexDirection: 'row', alignItems: 'center', gap: 12 }, shopTitle: { color: '#eff8fa', fontSize: 31, fontWeight: '900', fontStyle: 'italic' }, shopIntro: { color: '#9eb5c0', fontSize: 12, lineHeight: 17 }, notice: { color: '#ffcf5a', fontSize: 11, fontWeight: '900', textAlign: 'center', padding: 10, borderRadius: 10, backgroundColor: '#2b3029' }, item: { minHeight: 94, borderRadius: 15, padding: 12, backgroundColor: '#10283a', borderWidth: 1, borderColor: '#294354', flexDirection: 'row', alignItems: 'center', gap: 11 }, itemArt: { width: 62, height: 68, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, carbon: { backgroundColor: '#151c25' }, itemGlyph: { color: '#071624', fontSize: 25, fontWeight: '900' }, itemCopy: { flex: 1 }, itemKind: { color: '#23dcb6', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 }, itemName: { color: '#eff8fa', fontSize: 16, fontWeight: '900', marginTop: 3 }, cash: { color: '#768f9c', fontSize: 8, fontWeight: '800', marginTop: 7 }, buy: { minWidth: 70, height: 40, paddingHorizontal: 9, borderRadius: 11, backgroundColor: '#ffcf5a', alignItems: 'center', justifyContent: 'center' }, owned: { backgroundColor: '#18483f' }, unaffordable: { opacity: .58 }, buyText: { color: '#071624', fontSize: 10, fontWeight: '900' }, careerBox: { marginTop: 4, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#345263', backgroundColor: '#0d2232', gap: 5 },
  settingsPage: { flex: 1, padding: 18, gap: 20 }, settingCard: { marginTop: 18, minHeight: 92, padding: 16, borderRadius: radii.card, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorderStrong, flexDirection: 'row', alignItems: 'center', gap: 14 }, settingCopy: { flex: 1 }, settingTitle: { color: c.ice100, fontFamily: fonts.display, fontSize: 16 }, settingBody: { color: c.ice400, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 }, toggle: { width: 62, height: 38, borderRadius: 19, backgroundColor: c.meterTrack, borderWidth: 1, borderColor: c.surfaceBorderStrong, alignItems: 'center', justifyContent: 'center' }, toggleOn: { backgroundColor: c.teal }, toggleText: { color: c.ice400, fontFamily: fonts.label, fontSize: 11 }, toggleTextOn: { color: c.ink }, settingsNote: { color: c.ice600, fontFamily: fonts.body, fontSize: 11, textAlign: 'center' },
});
