import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './constants'
import { NeonDriftScene } from './NeonDriftScene'

export type GameBridge = {
  start: () => void
  restart: () => void
  toggleMute: () => boolean
  destroy: () => void
}

export const createNeonDriftGame = (parent: HTMLElement): GameBridge => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#0B0F1A',
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { x: 0, y: 0 },
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [NeonDriftScene],
  }

  const game = new Phaser.Game(config)

  const withScene = (action: (scene: NeonDriftScene) => void) => {
    const run = () => {
      const scene = game.scene.getScene('neon') as NeonDriftScene
      action(scene)
    }
    if (game.isBooted) {
      run()
    } else {
      game.events.once(Phaser.Core.Events.READY, run)
    }
  }

  return {
    start: () => withScene((scene) => scene.startRun()),
    restart: () => withScene((scene) => scene.restart()),
    toggleMute: () => {
      let muted = false
      withScene((scene) => {
        muted = scene.toggleMute()
      })
      return muted
    },
    destroy: () => {
      game.destroy(true)
    },
  }
}
