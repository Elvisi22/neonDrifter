export type GameState = 'idle' | 'running' | 'over'

export type GameStats = {
  score: number
  best: number
  combo: number
  gates: number
  streak: number
  nearMisses: number
}

const events = new EventTarget()

export const emitStats = (stats: GameStats) => {
  events.dispatchEvent(new CustomEvent<GameStats>('stats', { detail: stats }))
}

export const onStats = (handler: (stats: GameStats) => void) => {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<GameStats>
    handler(custom.detail)
  }
  events.addEventListener('stats', listener)
  return () => events.removeEventListener('stats', listener)
}

export const emitState = (state: GameState) => {
  events.dispatchEvent(new CustomEvent<GameState>('state', { detail: state }))
}

export const onState = (handler: (state: GameState) => void) => {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<GameState>
    handler(custom.detail)
  }
  events.addEventListener('state', listener)
  return () => events.removeEventListener('state', listener)
}
