let audioContext: AudioContext | null = null

const getContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

const playTone = (frequency: number, duration: number, volume = 0.08) => {
  const context = getContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.value = frequency
  gain.gain.value = volume

  oscillator.connect(gain)
  gain.connect(context.destination)

  const now = context.currentTime
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.start(now)
  oscillator.stop(now + duration)
}

export const playClick = () => playTone(520, 0.08)
export const playCombo = (tier: number) => playTone(620 + tier * 40, 0.12)
export const playPulse = () => playTone(420, 0.18, 0.1)
export const playFail = () => playTone(180, 0.25, 0.1)
