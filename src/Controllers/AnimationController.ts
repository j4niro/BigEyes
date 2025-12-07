// controllers/AnimationController.ts
import type { Dispatch } from '@reduxjs/toolkit'
import { setYearRange } from '../Redux/Slice/GlobalSlice'

export type AnimationSpeed = 1 | 1.5 | 2 

export class AnimationController {
  private dispatch: Dispatch
  private animationFrameId: number | null = null
  private currentSpeed: AnimationSpeed = 1
  private isPlaying: boolean = false
  private startTime: number = 0
  private currentYearFloat: number = 1880

  constructor(dispatch: Dispatch) {
    this.dispatch = dispatch
  }

  /**
   * Animation fluide avec interpolation temporelle
   */
  play(currentYear: number, onYearUpdate: (year: number, progress: number) => void): void {
    if (this.isPlaying) return

    this.isPlaying = true
    this.currentYearFloat = currentYear
    this.startTime = performance.now()

    const animate = (timestamp: number) => {
      if (!this.isPlaying) return

      const elapsed = timestamp - this.startTime
      this.startTime = timestamp

      // Années par seconde (ajustable)
      const yearsPerSecond = this.currentSpeed * 2
      const yearIncrement = (elapsed / 1000) * yearsPerSecond

      this.currentYearFloat += yearIncrement

      if (this.currentYearFloat >= 2025) {
        this.currentYearFloat = 2025
        onYearUpdate(2025, 0)
        this.dispatch(setYearRange({ start: 2025, end: 2025 }))
        this.stop()
        return
      }

      const currentYearInt = Math.floor(this.currentYearFloat)
      const progress = this.currentYearFloat - currentYearInt

      // Mettre à jour avec l'année actuelle ET le pourcentage de progression
      onYearUpdate(currentYearInt, progress)
      
      // Dispatcher uniquement quand l'année change
      const dispatchYear = Math.floor(this.currentYearFloat)
      this.dispatch(setYearRange({ start: dispatchYear, end: dispatchYear }))

      this.animationFrameId = requestAnimationFrame(animate)
    }

    this.animationFrameId = requestAnimationFrame(animate)
  }

  pause(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
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
    this.currentYearFloat = clampedYear
    this.dispatch(setYearRange({ start: clampedYear, end: clampedYear }))
  }

  next10Years(currentYear: number): void {
    const newYear = Math.min(currentYear + 10, 2025)
    this.currentYearFloat = newYear
    this.dispatch(setYearRange({ start: newYear, end: newYear }))
  }

  previous10Years(currentYear: number): void {
    const newYear = Math.max(currentYear - 10, 1880)
    this.currentYearFloat = newYear
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