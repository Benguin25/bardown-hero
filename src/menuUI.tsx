import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AchievementState } from './achievements';
import type { Progress } from './progress';
import { SHOP_ITEMS, puckBalance, type ShopItem, type ShopState } from './store';
import { Band, Button, Glow, Rise, s } from './ui';
import { c, fonts, radii } from './theme';

export function HomeScreen({ name, pucks, soundOn, onPlay, onLocker, onShop, onAchievements, onHelp, onSound }: {
  name: string; pucks: number; soundOn: boolean; onPlay: () => void; onLocker: () => void; onShop: () => void;
  onAchievements: () => void; onHelp: () => void; onSound: () => void;
}) {
  return <SafeAreaView style={s.root}><View style={m.home}><Band colors={['#0D3540', '#071F2D', c.ink]} /><Glow color={c.teal} opacity={0.15} cy="18%" />
    <Rise style={m.hero}><Text style={m.kicker}>ONE PUCK. BIG PLAYS.</Text><Text style={m.logo}>BARDOWN<Text style={m.teal}> HERO</Text></Text><Text style={m.welcome}>WELCOME BACK, {name.toUpperCase()}</Text></Rise>
    <View style={m.balance}><Text style={m.puckGlyph}>●</Text><Text style={m.balanceValue}>{pucks}</Text><Text style={m.balanceLabel}>PUCKS</Text></View>
    <View style={m.menu}>
      <Button style={m.play} onPress={onPlay}><Text style={m.playText}>PLAY</Text><Text style={m.arrow}>▶</Text></Button>
      <View style={m.menuRow}><Button style={m.menuButton} onPress={onLocker}><Text style={m.menuText}>LOCKER</Text></Button><Button style={m.menuButton} onPress={onShop}><Text style={m.menuText}>SHOP</Text></Button></View>
      <View style={m.menuRow}><Button style={m.menuButton} onPress={onAchievements}><Text style={m.menuText}>ACHIEVEMENTS</Text></Button><Button style={m.menuButton} onPress={onHelp}><Text style={m.menuText}>HOW TO PLAY</Text></Button></View>
    </View>
    <Button style={m.sound} onPress={onSound}><Text style={m.soundText}>SOUND {soundOn ? 'ON' : 'OFF'}</Text></Button>
  </View></SafeAreaView>;
}

export function ShopScreen({ state, progress, achievements, onBuy, onBack }: {
  state: ShopState; progress: Progress; achievements: AchievementState; onBuy: (item: ShopItem) => boolean; onBack: () => void;
}) {
  const balance = puckBalance(state, progress, achievements);
  const [notice, setNotice] = useState('');
  return <SafeAreaView style={s.root}><ScrollView contentContainerStyle={m.shopPage} showsVerticalScrollIndicator={false}>
    <View style={m.shopHead}><Button style={s.chromeSquare} onPress={onBack}><Text style={s.chromeGlyph}>‹</Text></Button><View style={{ flex: 1 }}><Text style={m.kicker}>GEAR UP</Text><Text style={m.shopTitle}>THE SHOP</Text></View><View style={m.balanceSmall}><Text style={m.puckGlyph}>●</Text><Text style={m.balanceValue}>{balance}</Text></View></View>
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
  home: { flex: 1, padding: 20, justifyContent: 'center' }, hero: { alignItems: 'center', marginBottom: 24 }, kicker: { color: c.teal, fontFamily: fonts.label, fontSize: 10, letterSpacing: 2.2 }, logo: { color: c.ice100, fontFamily: fonts.displayItalic, fontSize: 38, lineHeight: 42, letterSpacing: -1.7, marginTop: 5 }, teal: { color: c.teal }, welcome: { color: c.ice400, fontFamily: fonts.labelSoft, fontSize: 11, letterSpacing: 1.1, marginTop: 9 },
  balance: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, height: 38, borderRadius: 19, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorderStrong, marginBottom: 16 }, balanceSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, height: 36, borderRadius: 18, backgroundColor: c.surface }, puckGlyph: { color: c.gold, fontSize: 13 }, balanceValue: { color: c.gold, fontFamily: fonts.numeral, fontSize: 16 }, balanceLabel: { color: c.ice400, fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.2 },
  menu: { gap: 9 }, play: { minHeight: 72, borderRadius: radii.card, backgroundColor: c.teal, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, playText: { color: c.ink, fontFamily: fonts.displayItalic, fontSize: 27 }, arrow: { color: c.ink, fontSize: 22 }, menuRow: { flexDirection: 'row', gap: 9 }, menuButton: { flex: 1, minHeight: 54, paddingHorizontal: 8, borderRadius: radii.chip, backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorderStrong, alignItems: 'center', justifyContent: 'center' }, menuText: { color: c.ice200, fontFamily: fonts.label, fontSize: 11, letterSpacing: .7 }, sound: { alignSelf: 'center', marginTop: 18, padding: 10 }, soundText: { color: c.ice500, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.2 },
  shopPage: { padding: 18, paddingBottom: 42, gap: 12 }, shopHead: { flexDirection: 'row', alignItems: 'center', gap: 12 }, shopTitle: { color: '#eff8fa', fontSize: 31, fontWeight: '900', fontStyle: 'italic' }, shopIntro: { color: '#9eb5c0', fontSize: 12, lineHeight: 17 }, notice: { color: '#ffcf5a', fontSize: 11, fontWeight: '900', textAlign: 'center', padding: 10, borderRadius: 10, backgroundColor: '#2b3029' }, item: { minHeight: 94, borderRadius: 15, padding: 12, backgroundColor: '#10283a', borderWidth: 1, borderColor: '#294354', flexDirection: 'row', alignItems: 'center', gap: 11 }, itemArt: { width: 62, height: 68, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, carbon: { backgroundColor: '#151c25' }, itemGlyph: { color: '#071624', fontSize: 25, fontWeight: '900' }, itemCopy: { flex: 1 }, itemKind: { color: '#23dcb6', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 }, itemName: { color: '#eff8fa', fontSize: 16, fontWeight: '900', marginTop: 3 }, cash: { color: '#768f9c', fontSize: 8, fontWeight: '800', marginTop: 7 }, buy: { minWidth: 70, height: 40, paddingHorizontal: 9, borderRadius: 11, backgroundColor: '#ffcf5a', alignItems: 'center', justifyContent: 'center' }, owned: { backgroundColor: '#18483f' }, unaffordable: { opacity: .58 }, buyText: { color: '#071624', fontSize: 10, fontWeight: '900' }, careerBox: { marginTop: 4, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#345263', backgroundColor: '#0d2232', gap: 5 },
});
