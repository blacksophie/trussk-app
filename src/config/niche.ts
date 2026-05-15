// ── Niche configuration ────────────────────────────────────────────────────────
//
// All white-label customisation flows through this file.
// Set VITE_* environment variables per deployment to configure a new niche.
// Defaults are the heavy civil configuration.
//
// Example .env for a Tunneling deployment:
//   VITE_APP_NAME=TunnelForce
//   VITE_NICHE_ID=tunneling
//   VITE_NICHE_DISPLAY=Tunneling & Underground Construction
//   VITE_NICHE_TAGLINE=Connecting the best underground talent with the firms that need them.
//   VITE_NICHE_INDUSTRIES=Tunnel Boring,NATM,Cut and Cover,Shaft Sinking,Underground Utilities
//   VITE_MARKET_SOC=47-2171
//   VITE_MARKET_LOCATION=California
//   VITE_MARKET_JOB_TITLE=Tunnel Superintendent

const raw = {
  appName:       import.meta.env.VITE_APP_NAME         ?? 'Trussk',
  nicheId:       import.meta.env.VITE_NICHE_ID         ?? 'heavy_civil',
  nicheDisplay:  import.meta.env.VITE_NICHE_DISPLAY    ?? 'Heavy Civil & Infrastructure',
  nicheTagline:  import.meta.env.VITE_NICHE_TAGLINE    ?? 'Connecting the best heavy civil talent with the firms that need them.',
  industries:    import.meta.env.VITE_NICHE_INDUSTRIES ?? 'Heavy Civil Engineering,Infrastructure (roads, bridges, utilities, drainage),Road & Bridge construction,Heavy Highway construction,Marine Construction',
  marketSoc:     import.meta.env.VITE_MARKET_SOC       ?? '11-9021',
  marketLocation:import.meta.env.VITE_MARKET_LOCATION  ?? 'Florida',
  marketJobTitle:import.meta.env.VITE_MARKET_JOB_TITLE ?? 'Construction Manager',
};

export const NICHE = {
  appName:        raw.appName,
  id:             raw.nicheId,
  display:        raw.nicheDisplay,
  tagline:        raw.nicheTagline,
  industries:     raw.industries.split(',').map((s: string) => s.trim()),
  marketSoc:      raw.marketSoc,
  marketLocation: raw.marketLocation,
  marketJobTitle: raw.marketJobTitle,
} as const;
