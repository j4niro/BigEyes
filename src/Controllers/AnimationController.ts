// controllers/AnimationController.ts
// controllers/AnimationController.ts
import type { Dispatch } from '@reduxjs/toolkit'
import { setYearRange } from '../Redux/Slice/GlobalSlice'

export type AnimationSpeed = 1 | 2 | 5 | 10

export class AnimationController {
  private dispatch: Dispatch
  private intervalId: NodeJS.Timeout | null = null
  private currentSpeed: AnimationSpeed = 1
  private isPlaying: boolean = false

  constructor(dispatch: Dispatch) {
    this.dispatch = dispatch
  }

  /**
   * Démarre l'animation avec interpolation fluide
   */
  play(currentYear: number, onYearChange: (year: number) => void): void {
    if (this.isPlaying) return

    this.isPlaying = true
    
    // Intervalle plus court pour plus de fluidité
    // Speed 1 = 700ms par an (au lieu de 1000ms)
    const intervalMs = 700 / this.currentSpeed

    this.intervalId = setInterval(() => {
      const nextYear = currentYear + 1

      if (nextYear > 2025) {
        this.stop()
        return
      }

      currentYear = nextYear
      onYearChange(nextYear)
      this.dispatch(setYearRange({ start: nextYear, end: nextYear }))
    }, intervalMs)
  }

  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      this.isPlaying = false
    }
  }

  stop(): void {
    this.pause()
  }

  setSpeed(speed: AnimationSpeed): void {
    this.currentSpeed = speed
  }

  getSpeed(): AnimationSpeed {
    return this.currentSpeed
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  jumpToYear(year: number): void {
    const clampedYear = Math.max(1880, Math.min(2025, year))
    this.dispatch(setYearRange({ start: clampedYear, end: clampedYear }))
  }

  next10Years(currentYear: number): void {
    const newYear = Math.min(currentYear + 10, 2025)
    this.dispatch(setYearRange({ start: newYear, end: newYear }))
  }

  previous10Years(currentYear: number): void {
    const newYear = Math.max(currentYear - 10, 1880)
    this.dispatch(setYearRange({ start: newYear, end: newYear }))
  }

  goToStart(): void {
    this.jumpToYear(1880)
  }

  goToEnd(): void {
    this.jumpToYear(2025)
  }

  cleanup(): void {
    this.pause()
  }
}