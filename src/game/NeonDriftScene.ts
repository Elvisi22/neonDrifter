import Phaser from 'phaser'
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './constants'
import { emitState, emitStats } from './events'
import { getBestScore, initDailyStreak, setBestScore, getMute, setMute } from './storage'
import { playClick, playCombo, playFail, playPulse } from './sfx'

type Gate = {
  left: Phaser.GameObjects.Rectangle
  right: Phaser.GameObjects.Rectangle
  gapCenter: number
  gapWidth: number
  speed: number
  passed: boolean
  pulse: boolean
  driftAmp: number
  driftSpeed: number
  phase: number
}

export class NeonDriftScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private playerBody!: Phaser.Physics.Arcade.Body
  private targetX = GAME_WIDTH / 2
  private gates: Gate[] = []
  private spawnTimer = 0
  private speed = 160
  private speedTarget = 160
  private gateInterval = 0.9
  private running = false
  private score = 0
  private combo = 0
  private gatesPassed = 0
  private runTime = 0
  private best = 0
  private streak = 1
  private nearMisses = 0
  private muted = false
  private grid!: Phaser.GameObjects.TileSprite
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter
  private lastEmitScore = -1
  private lastEmitCombo = -1
  private lastEmitBest = -1
  private lastEmitGates = -1
  private lastEmitNear = -1

  constructor() {
    super('neon')
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg)

    const gridGfx = this.make.graphics({ x: 0, y: 0 })
    gridGfx.lineStyle(1, 0x162033, 0.35)
    for (let x = 0; x <= GAME_WIDTH; x += 24) {
      gridGfx.lineBetween(x, 0, x, GAME_HEIGHT)
    }
    for (let y = 0; y <= GAME_HEIGHT; y += 24) {
      gridGfx.lineBetween(0, y, GAME_WIDTH, y)
    }
    gridGfx.generateTexture('grid', GAME_WIDTH, GAME_HEIGHT)
    gridGfx.setVisible(false)
    gridGfx.destroy()

    const dotGfx = this.make.graphics({ x: 0, y: 0 })
    dotGfx.fillStyle(COLORS.primary, 1)
    dotGfx.fillCircle(4, 4, 4)
    dotGfx.generateTexture('dot', 8, 8)
    dotGfx.setVisible(false)
    dotGfx.destroy()

    this.grid = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'grid').setOrigin(0)

    this.particles = this.add.particles(0, 0, 'dot', {
      lifespan: 420,
      speed: { min: 40, max: 140 },
      scale: { start: 0.8, end: 0 },
      quantity: 10,
      blendMode: 'ADD',
    })

    this.player = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, 18, 18, COLORS.primary)
    this.player.setStrokeStyle(2, COLORS.accent, 0.9)
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setAllowGravity(false)
    this.playerBody.setImmovable(true)

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.targetX = Phaser.Math.Clamp(pointer.x, 20, GAME_WIDTH - 20)
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.targetX = Phaser.Math.Clamp(pointer.x, 20, GAME_WIDTH - 20)
    })

    this.best = getBestScore()
    this.streak = initDailyStreak()
    this.muted = getMute()
    this.emitStats()
    emitState('idle')
  }

  startRun() {
    if (this.running) {
      return
    }
    this.resetRun()
    this.running = true
    emitState('running')
  }

  restart() {
    this.running = false
    this.resetRun()
    this.running = true
    emitState('running')
  }

  toggleMute() {
    this.muted = !this.muted
    setMute(this.muted)
    return this.muted
  }

  update(_: number, delta: number) {
    const dt = delta / 1000
    if (!this.running) {
      this.grid.tilePositionY -= 6 * dt
      return
    }

    this.runTime += dt

    this.grid.tilePositionY -= this.speed * 0.2 * dt

    this.speedTarget = 160 + this.gatesPassed * 4 + this.runTime * 6
    this.speed = Phaser.Math.Linear(this.speed, this.speedTarget, 0.02)

    this.spawnTimer += dt
    if (this.spawnTimer >= this.gateInterval) {
      this.spawnTimer = 0
      this.spawnGate()
    }

    this.player.x = Phaser.Math.Linear(this.player.x, this.targetX, 0.35)
    this.playerBody.updateFromGameObject()

    const now = this.time.now / 1000

    this.gates.forEach((gate) => {
      const drift = Math.sin(now * gate.driftSpeed + gate.phase) * gate.driftAmp
      gate.gapCenter = Phaser.Math.Clamp(gate.gapCenter + drift * dt, 80, GAME_WIDTH - 80)

      const leftWidth = gate.gapCenter - gate.gapWidth / 2
      const rightWidth = GAME_WIDTH - (gate.gapCenter + gate.gapWidth / 2)

      gate.left.setDisplaySize(leftWidth, gate.left.height)
      gate.left.x = 0
      gate.right.setDisplaySize(rightWidth, gate.right.height)
      gate.right.x = GAME_WIDTH - rightWidth

      gate.left.y += gate.speed * dt
      gate.right.y += gate.speed * dt

      const leftBody = gate.left.body as Phaser.Physics.Arcade.Body
      const rightBody = gate.right.body as Phaser.Physics.Arcade.Body
      leftBody.updateFromGameObject()
      rightBody.updateFromGameObject()

      if (!gate.passed && gate.left.y >= this.player.y) {
        gate.passed = true
        this.handleGatePass(gate)
      }
    })

    this.gates = this.gates.filter((gate) => {
      const offscreen = gate.left.y > GAME_HEIGHT + 60
      if (offscreen) {
        gate.left.destroy()
        gate.right.destroy()
      }
      return !offscreen
    })
  }

  private spawnGate() {
    const gapWidth = Phaser.Math.Clamp(140 - this.gatesPassed * 1.1, 78, 140)
    const gapCenter = Phaser.Math.Between(80, GAME_WIDTH - 80)
    const gateHeight = 26
    const pulse = (this.gatesPassed + 1) % 6 === 0

    const leftWidth = gapCenter - gapWidth / 2
    const rightWidth = GAME_WIDTH - (gapCenter + gapWidth / 2)

    const gateColor = pulse ? COLORS.gatePulse : COLORS.gate

    const left = this.add.rectangle(0, -gateHeight, leftWidth, gateHeight, gateColor).setOrigin(0, 0.5)
    const right = this.add.rectangle(GAME_WIDTH - rightWidth, -gateHeight, rightWidth, gateHeight, gateColor).setOrigin(0, 0.5)

    this.physics.add.existing(left)
    this.physics.add.existing(right)

    const leftBody = left.body as Phaser.Physics.Arcade.Body
    const rightBody = right.body as Phaser.Physics.Arcade.Body

    leftBody.setAllowGravity(false)
    rightBody.setAllowGravity(false)
    leftBody.setImmovable(true)
    rightBody.setImmovable(true)

    this.physics.add.overlap(this.player, left, () => this.endRun(), undefined, this)
    this.physics.add.overlap(this.player, right, () => this.endRun(), undefined, this)

    this.gates.push({
      left,
      right,
      gapCenter,
      gapWidth,
      speed: this.speed,
      passed: false,
      pulse,
      driftAmp: Phaser.Math.Between(4, 12),
      driftSpeed: Phaser.Math.FloatBetween(0.6, 1.2),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
    })
  }

  private handleGatePass(gate: Gate) {
    this.gatesPassed += 1
    this.combo += 1
    this.score += Math.floor(8 + this.combo * 1.4)

    const gapEdgeLeft = gate.gapCenter - gate.gapWidth / 2
    const gapEdgeRight = gate.gapCenter + gate.gapWidth / 2
    const nearEdge = Math.min(Math.abs(this.player.x - gapEdgeLeft), Math.abs(this.player.x - gapEdgeRight))
    if (nearEdge < 12) {
      this.nearMisses += 1
      this.cameras.main.shake(60, 0.002)
    }

    if (!this.muted) {
      playClick()
      if (this.combo > 1 && this.combo % 4 === 0) {
        playCombo(Math.min(this.combo, 8))
      }
    }

    if (gate.pulse) {
      this.speed = Math.max(120, this.speed * 0.9)
      this.speedTarget = Math.max(160, this.speedTarget * 0.94)
      if (!this.muted) {
        playPulse()
      }
      this.particles.emitParticleAt(this.player.x, this.player.y, 18)
      this.tweens.add({
        targets: this.player,
        scale: 1.2,
        yoyo: true,
        duration: 120,
        ease: 'sine.out',
      })
    }

    if (navigator.vibrate) {
      navigator.vibrate(8)
    }

    if (this.score > this.best) {
      this.best = this.score
      setBestScore(this.best)
    }

    this.emitStats()
  }

  private endRun() {
    if (!this.running) {
      return
    }
    this.running = false
    this.combo = 0
    if (!this.muted) {
      playFail()
    }
    emitState('over')
    this.emitStats(true)
  }

  private resetRun() {
    this.gates.forEach((gate) => {
      gate.left.destroy()
      gate.right.destroy()
    })
    this.gates = []
    this.score = 0
    this.combo = 0
    this.gatesPassed = 0
    this.nearMisses = 0
    this.runTime = 0
    this.speed = 160
    this.speedTarget = 160
    this.spawnTimer = 0
    this.emitStats()
  }

  private emitStats(force = false) {
    if (
      !force &&
      this.lastEmitScore === this.score &&
      this.lastEmitCombo === this.combo &&
      this.lastEmitBest === this.best &&
      this.lastEmitGates === this.gatesPassed &&
      this.lastEmitNear === this.nearMisses
    ) {
      return
    }

    this.lastEmitScore = this.score
    this.lastEmitCombo = this.combo
    this.lastEmitBest = this.best
    this.lastEmitGates = this.gatesPassed
    this.lastEmitNear = this.nearMisses

    emitStats({
      score: this.score,
      best: this.best,
      combo: this.combo,
      gates: this.gatesPassed,
      streak: this.streak,
      nearMisses: this.nearMisses,
    })
  }
}
