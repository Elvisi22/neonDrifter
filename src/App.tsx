import { useEffect, useRef, useState } from 'react'
import { createNeonDriftGame } from './game/NeonDriftGame'
import type { GameBridge } from './game/NeonDriftGame'
import { onState, onStats } from './game/events'
import { getMute } from './game/storage'
import './App.css'

const initialStats = {
  score: 0,
  best: 0,
  combo: 0,
  gates: 0,
  streak: 1,
  nearMisses: 0,
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const bridgeRef = useRef<GameBridge | null>(null)
  const [stats, setStats] = useState(initialStats)
  const [state, setState] = useState<'idle' | 'running' | 'over'>('idle')
  const [muted, setMuted] = useState(getMute())

  useEffect(() => {
    if (!containerRef.current) {
      return
    }
    bridgeRef.current = createNeonDriftGame(containerRef.current)
    return () => bridgeRef.current?.destroy()
  }, [])

  useEffect(() => {
    const offStats = onStats((value) => setStats(value))
    const offState = onState((value) => setState(value))
    return () => {
      offStats()
      offState()
    }
  }, [])

  const handleStart = () => bridgeRef.current?.start()
  const handleRestart = () => bridgeRef.current?.restart()
  const handleMute = () => {
    const next = bridgeRef.current?.toggleMute() ?? !muted
    setMuted(next)
  }

  return (
    <div className="app">
      <header className="hud">
        <div className="hud__block">
          <span className="hud__label">Score</span>
          <span className="hud__value">{stats.score}</span>
        </div>
        <div className="hud__block">
          <span className="hud__label">Combo</span>
          <span className={`hud__value ${stats.combo >= 4 ? 'hud__value--hot' : ''}`}>
            {stats.combo}
          </span>
        </div>
        <div className="hud__block">
          <span className="hud__label">Best</span>
          <span className="hud__value">{stats.best}</span>
        </div>
        <div className="hud__block">
          <span className="hud__label">Gates</span>
          <span className="hud__value">{stats.gates}</span>
        </div>
        <div className="hud__block">
          <span className="hud__label">Streak</span>
          <span className="hud__value">{stats.streak}×</span>
        </div>
        <div className="hud__block">
          <span className="hud__label">Near</span>
          <span className="hud__value">{stats.nearMisses}</span>
        </div>
      </header>

      <div className="game-frame">
        <div className="game-canvas" ref={containerRef} />
        <div className={`overlay ${state !== 'running' ? 'overlay--show' : ''}`}>
          <div className="overlay__card">
            <h1>Neon Drift</h1>
            <p>Slide to dodge. Chain gates. Chase the pulse.</p>
            <button className="primary" onClick={state === 'over' ? handleRestart : handleStart}>
              {state === 'over' ? 'Try Again' : 'Start Run'}
            </button>
            <div className="overlay__meta">
              <span>Streak {stats.streak}×</span>
              <span>Near Miss {stats.nearMisses}</span>
              <span>Gates {stats.gates}</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="controls">
        <button className="ghost" onClick={handleMute}>
          {muted ? 'Sound Off' : 'Sound On'}
        </button>
        <button className="ghost" onClick={handleRestart}>
          Quick Restart
        </button>
      </footer>
    </div>
  )
}

export default App
