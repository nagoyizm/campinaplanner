/* Estado global del recorrido de demo: numeración continua entre las dos fases */
export const AGENDIO_STEPS = 6
export const PLANNER_STAGES = 8
export const TOTAL_DEMO_STEPS = AGENDIO_STEPS + PLANNER_STAGES

const STEP_KEY = 'demo-paso'

export function getStoredStep(): number {
  try {
    const v = parseInt(sessionStorage.getItem(STEP_KEY) ?? '', 10)
    return Number.isFinite(v) ? v : 0
  } catch { return 0 }
}

export function storeStep(n: number) {
  try { sessionStorage.setItem(STEP_KEY, String(n)) } catch { /* noop */ }
}

/** Reinicia la demo completa desde cualquier punto */
export function resetDemo() {
  try { sessionStorage.removeItem(STEP_KEY) } catch { /* noop */ }
  window.location.href = '/demo/agendio'
}

const THEME_KEY = 'demo-theme'

export function getDemoTheme(): 'light' | 'dark' {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* noop */ }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function storeDemoTheme(theme: 'light' | 'dark') {
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* noop */ }
}
