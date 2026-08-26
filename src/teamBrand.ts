import type { CSSProperties } from 'react'

export const TEAM_BRAND_COLORS = {
  NYY: { background: '#132448', foreground: '#FFFFFF', accent: '#132448' },
  LAD: { background: '#005A9C', foreground: '#FFFFFF', accent: '#005A9C' },
  BOS: { background: '#BD3039', foreground: '#FFFFFF', accent: '#BD3039' },
  SF: { background: '#FD5A1E', foreground: '#27251F', accent: '#9E3213' },
  CHC: { background: '#0E3386', foreground: '#FFFFFF', accent: '#0E3386' },
  SD: { background: '#2F241D', foreground: '#FFFFFF', accent: '#2F241D' },
  SEA: { background: '#005C5C', foreground: '#FFFFFF', accent: '#005C5C' },
  STL: { background: '#C41E3A', foreground: '#FFFFFF', accent: '#C41E3A' },
  NYM: { background: '#002D72', foreground: '#FFFFFF', accent: '#002D72' },
  HOU: { background: '#002D62', foreground: '#FFFFFF', accent: '#002D62' },
  PHI: { background: '#E81828', foreground: '#FFFFFF', accent: '#C01422' },
  ATL: { background: '#CE1141', foreground: '#FFFFFF', accent: '#B20F38' },
  TEX: { background: '#003278', foreground: '#FFFFFF', accent: '#003278' },
  TOR: { background: '#134A8E', foreground: '#FFFFFF', accent: '#134A8E' },
  CLE: { background: '#00385D', foreground: '#FFFFFF', accent: '#00385D' },
  MIN: { background: '#002B5C', foreground: '#FFFFFF', accent: '#002B5C' },
  DET: { background: '#0C2340', foreground: '#FFFFFF', accent: '#0C2340' },
  BAL: { background: '#DF4601', foreground: '#080808', accent: '#963100' },
  TB: { background: '#092C5C', foreground: '#FFFFFF', accent: '#092C5C' },
  ARI: { background: '#A71930', foreground: '#FFFFFF', accent: '#A71930' },
  MIL: { background: '#12284B', foreground: '#FFFFFF', accent: '#12284B' },
  CIN: { background: '#C6011F', foreground: '#FFFFFF', accent: '#B0011C' },
  KC: { background: '#004687', foreground: '#FFFFFF', accent: '#004687' },
  LAA: { background: '#BA0021', foreground: '#FFFFFF', accent: '#A3001D' },
  PIT: { background: '#FDB827', foreground: '#27251F', accent: '#6B4A00' },
  WSH: { background: '#AB0003', foreground: '#FFFFFF', accent: '#AB0003' },
  MIA: { background: '#0077C8', foreground: '#FFFFFF', accent: '#0067AD' },
  COL: { background: '#333366', foreground: '#FFFFFF', accent: '#333366' },
  CWS: { background: '#27251F', foreground: '#FFFFFF', accent: '#27251F' },
  ATH: { background: '#003831', foreground: '#FFFFFF', accent: '#003831' },
} as const

export type TeamCode = keyof typeof TEAM_BRAND_COLORS
export type TeamBrand = (typeof TEAM_BRAND_COLORS)[TeamCode]

export const teamBrandByCode = (code: string): TeamBrand | undefined => TEAM_BRAND_COLORS[code as TeamCode]

export const teamBadgeStyle = (code: string): CSSProperties | undefined => {
  const brand = teamBrandByCode(code)
  return brand ? { backgroundColor: brand.background, borderColor: brand.background, color: brand.foreground } : undefined
}

export const teamAccentStyle = (code: string): CSSProperties | undefined => {
  const brand = teamBrandByCode(code)
  return brand ? { color: brand.accent } : undefined
}

export const teamTagStyle = (tag: string, active = false): CSSProperties | undefined => {
  if (!tag.startsWith('#')) return undefined
  const brand = teamBrandByCode(tag.slice(1))
  if (!brand) return undefined
  return active
    ? { backgroundColor: brand.background, color: brand.foreground }
    : { color: brand.accent }
}
