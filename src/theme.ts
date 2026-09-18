// Design tokens for the UI redesign. Every screen reads colour, type and shape
// from here so the map, HUD and career screens stay one system.

export const c = {
  ink: '#04101A',
  inkRaised: '#071D2A',
  surface: '#0A2434',
  surfaceBorder: '#16394A',
  surfaceBorderStrong: '#1D4E5E',
  teal: '#17E2AD',
  tealDeep: '#0D3A35',
  tealNode: '#0D2E28',
  gold: '#FFC531',
  goldLight: '#FFD76B',
  goldDark: '#E8A51D',
  goldQuiet: '#C49A30',
  goldBorder: '#6B5C2A',
  goldTile: '#2A2413',
  goldTileEnd: '#0F1A20',
  ice100: '#F2FBFD',
  ice200: '#EAF6FA',
  ice300: '#B9D6E2',
  ice400: '#8FB0C0',
  ice500: '#6E91A3',
  ice600: '#5D788A',
  ice700: '#2F5668',
  locked: '#9DBCCB',
  lockedDim: '#7FA0B0',
  lockedDeep: '#40606F',
  chromeText: '#DFF0F7',
  bodyBright: '#CFE3EC',
  nodeLocked: '#0B1A24',
  meterTrack: '#12303F',
  dashedBorder: '#1F4A5E',
  // Translucent layers
  glass: 'rgba(220,245,255,0.07)',
  glassSoft: 'rgba(220,245,255,0.05)',
  glassBorder: 'rgba(180,220,240,0.14)',
  glassBorderStrong: 'rgba(180,220,240,0.16)',
  chrome: 'rgba(6,21,32,0.72)',
  chromeSolid: 'rgba(6,21,32,0.82)',
  chromeBorder: 'rgba(180,220,240,0.13)',
  scrim: 'rgba(4,16,26,0.62)',
  pathIdle: 'rgba(157,188,203,0.32)',
  pathFaint: 'rgba(157,188,203,0.16)',
  ringTrack: 'rgba(255,197,49,0.2)',
  ringIdle: 'rgba(157,188,203,0.3)',
  powerTrack: 'rgba(180,220,240,0.16)',
  goldWash: 'rgba(255,197,49,0.09)',
  goldEdge: 'rgba(255,197,49,0.3)',
  goldHalo: 'rgba(255,197,49,0.22)',
  dashedEdge: 'rgba(157,188,203,0.28)',
  hairline: 'rgba(157,188,203,0.18)',
} as const;

// Custom families carry their own weight and slant: never pair these with
// fontWeight/fontStyle or Android falls back to a synthesised face.
export const fonts = {
  displayItalic: 'Archivo_900Black_Italic',
  display: 'Archivo_900Black',
  label: 'BarlowCondensed_800ExtraBold',
  labelSoft: 'BarlowCondensed_600SemiBold',
  body: 'BarlowCondensed_500Medium',
  bodyStrong: 'BarlowCondensed_700Bold',
  numeral: 'SpaceMono_700Bold',
  numeralLight: 'SpaceMono_400Regular',
} as const;

/** Type roles from the handoff. Spread into a StyleSheet entry. */
export const t = {
  displayXL: { fontFamily: fonts.displayItalic, fontSize: 46, lineHeight: 46, letterSpacing: -2 },
  displayL: { fontFamily: fonts.displayItalic, fontSize: 24, lineHeight: 24, letterSpacing: -0.9 },
  cardTitle: { fontFamily: fonts.displayItalic, fontSize: 32, lineHeight: 31, letterSpacing: -1.4 },
  screenTitle: { fontFamily: fonts.displayItalic, fontSize: 22, letterSpacing: -0.8 },
  callout: { fontFamily: fonts.displayItalic, fontSize: 34, letterSpacing: -1.2 },
  countdown: { fontFamily: fonts.displayItalic, fontSize: 128, letterSpacing: -6 },
  rowTitle: { fontFamily: fonts.display, fontSize: 12, letterSpacing: -0.2 },
  eyebrow: { fontFamily: fonts.label, fontSize: 9, letterSpacing: 2.4 },
  label: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.4 },
  body: { fontFamily: fonts.body, fontSize: 12, letterSpacing: 0.4 },
  numeral: { fontFamily: fonts.numeral, fontSize: 14 },
} as const;

export const radii = { thumb: 8, chip: 13, card: 15, panel: 20, modal: 24, pill: 29 } as const;

/** Modal / glow shadows. RN needs elevation alongside the iOS shadow props. */
export const shadow = {
  modal: { shadowColor: '#000', shadowOpacity: 0.66, shadowRadius: 35, shadowOffset: { width: 0, height: 30 }, elevation: 24 },
  gold: { shadowColor: c.gold, shadowOpacity: 0.34, shadowRadius: 22, shadowOffset: { width: 0, height: 14 }, elevation: 14 },
  plate: { shadowColor: c.gold, shadowOpacity: 0.28, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
} as const;
