import { completedAchievementCount, type AchievementState } from './achievements';
import { totalStars } from './career';
import type { CosmeticKind } from './profile';
import type { Progress } from './progress';

export type ShopItem = { id: string; cosmeticId: string; label: string; kind: CosmeticKind; puckPrice: number; cashLabel: string; color?: string };
export type ShopState = { version: 1; owned: string[]; spent: number };

export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 'neon-kit', cosmeticId: 'neon', label: 'Neon Ice', kind: 'jerseyColor', puckPrice: 350, cashLabel: '$1.99', color: '#69F5FF' },
  { id: 'midnight-lid', cosmeticId: 'midnight', label: 'Midnight Lid', kind: 'helmetColor', puckPrice: 300, cashLabel: '$1.49', color: '#4C5B8E' },
  { id: 'gold-gloves', cosmeticId: 'shop-gold', label: 'Gold Gloves', kind: 'gloveColor', puckPrice: 450, cashLabel: '$2.49', color: '#E7B84B' },
  { id: 'pro-carbon', cosmeticId: 'pro-carbon', label: 'Pro Carbon', kind: 'stickStyle', puckPrice: 500, cashLabel: '$2.99' },
];

export const emptyShop = (): ShopState => ({ version: 1, owned: [], spent: 0 });
export function parseShop(raw: string | null): ShopState {
  if (!raw) return emptyShop();
  try {
    const value = JSON.parse(raw);
    const valid = new Set(SHOP_ITEMS.map(item => item.cosmeticId));
    return { version: 1, owned: Array.isArray(value?.owned) ? value.owned.filter((id: unknown): id is string => typeof id === 'string' && valid.has(id)) : [], spent: Number.isFinite(value?.spent) ? Math.max(0, Math.floor(value.spent)) : 0 };
  } catch { return emptyShop(); }
}
export const earnedPucks = (progress: Progress, achievements: AchievementState) => totalStars(progress) * 50 + completedAchievementCount(achievements) * 100;
export const puckBalance = (state: ShopState, progress: Progress, achievements: AchievementState) => Math.max(0, earnedPucks(progress, achievements) - state.spent);
export function buyWithPucks(state: ShopState, item: ShopItem, balance: number): ShopState | null {
  if (state.owned.includes(item.cosmeticId) || balance < item.puckPrice) return null;
  return { version: 1, owned: [...state.owned, item.cosmeticId], spent: state.spent + item.puckPrice };
}
