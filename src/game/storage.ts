import { STORAGE_KEYS } from './constants'

export const getBestScore = () => {
  const value = localStorage.getItem(STORAGE_KEYS.best)
  return value ? Number(value) : 0
}

export const setBestScore = (score: number) => {
  localStorage.setItem(STORAGE_KEYS.best, String(score))
}

const toDateKey = (date: Date) => date.toISOString().slice(0, 10)

const isYesterday = (lastDate: string, today: string) => {
  const last = new Date(lastDate)
  const current = new Date(today)
  const diff = current.getTime() - last.getTime()
  return diff > 0 && diff <= 1000 * 60 * 60 * 24 * 1.5
}

export const initDailyStreak = () => {
  const today = toDateKey(new Date())
  const last = localStorage.getItem(STORAGE_KEYS.lastDate)
  const currentStreak = localStorage.getItem(STORAGE_KEYS.streak)
  let streak = currentStreak ? Number(currentStreak) : 0

  if (!last) {
    streak = 1
  } else if (last === today) {
    streak = Math.max(1, streak)
  } else if (isYesterday(last, today)) {
    streak = streak + 1
  } else {
    streak = 1
  }

  localStorage.setItem(STORAGE_KEYS.streak, String(streak))
  localStorage.setItem(STORAGE_KEYS.lastDate, today)
  return streak
}

export const getMute = () => localStorage.getItem(STORAGE_KEYS.mute) === '1'

export const setMute = (muted: boolean) => {
  localStorage.setItem(STORAGE_KEYS.mute, muted ? '1' : '0')
}
