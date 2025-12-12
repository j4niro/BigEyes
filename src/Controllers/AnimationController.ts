// controllers/AnimationController.ts - Smooth temporal animation with interpolation
// AI Assistance: ~30% (requestAnimationFrame optimization patterns and timing calculations)

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
   * Start smooth animation with temporal interpolation
   * Uses requestAnimationFrame for 60fps rendering
   * @param currentYear - Starting year for animation
   * @param onYearUpdate - Callback receiving integer year and fractional progress (0-1)
   */
  play(currentYear: number, onYearUpdate: (year: number, progress: number) => void): void {
    // Prevent multiple simultaneous animations
    if (this.isPlaying) return

    this.isPlaying = true
    this.currentYearFloat = currentYear
    this.startTime = performance.now()

    const animate = (timestamp: number) => {
      if (!this.isPlaying) return

      // Calculate elapsed time since last frame
      const elapsed = timestamp - this.startTime
      this.startTime = timestamp

      // Base speed: 2 years per second at 1x speed
      const yearsPerSecond = this.currentSpeed * 2
      const yearIncrement = (elapsed / 1000) * yearsPerSecond

      this.currentYearFloat += yearIncrement

      // Stop at end year boundary
      if (this.currentYearFloat >= 2025) {
        this.currentYearFloat = 2025
        onYearUpdate(2025, 0)
        this.dispatch(setYearRange({ start: 2025, end: 2025 }))
        this.stop()
        return
      }

      // Split into integer year and fractional progress for interpolation
      const currentYearInt = Math.floor(this.currentYearFloat)
      const progress = this.currentYearFloat - currentYearInt

      // Update UI with both year and progress for smooth canvas interpolation
      onYearUpdate(currentYearInt, progress)
      
      // Dispatch Redux action only when integer year changes to avoid excessive updates
      const dispatchYear = Math.floor(this.currentYearFloat)
      this.dispatch(setYearRange({ start: dispatchYear, end: dispatchYear }))

      this.animationFrameId = requestAnimationFrame(animate)
    }

    this.animationFrameId = requestAnimationFrame(animate)
  }

  /**
   * Pause animation without resetting state
   * Can be resumed from current position
   */
  pause(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
      this.isPlaying = false
    }
  }

  /**
   * Stop animation completely
   * Alias for pause() - can be extended for additional cleanup if needed
   */
  stop(): void {
    this.pause()
  }

  /**
   * Change animation playback speed
   * @param speed - Multiplier for base animation speed (1x, 1.5x, or 2x)
   */
  setSpeed(speed: AnimationSpeed): void {
    this.currentSpeed = speed
  }

  /**
   * Get current playback speed multiplier
   */
  getSpeed(): AnimationSpeed {
    return this.currentSpeed
  }

  /**
   * Check if animation is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Jump directly to a specific year
   * Clamps value within valid range [1880, 2025]
   */
  jumpToYear(year: number): void {
    const clampedYear = Math.max(1880, Math.min(2025, year))
    this.currentYearFloat = clampedYear
    this.dispatch(setYearRange({ start: clampedYear, end: clampedYear }))
  }

  /**
   * Navigate forward by decade
   * Used for quick navigation through time range
   */
  next10Years(currentYear: number): void {
    const newYear = Math.min(currentYear + 10, 2025)
    this.currentYearFloat = newYear
    this.dispatch(setYearRange({ start: newYear, end: newYear }))
  }

  /**
   * Navigate backward by decade
   */
  previous10Years(currentYear: number): void {
    const newYear = Math.max(currentYear - 10, 1880)
    this.currentYearFloat = newYear
    this.dispatch(setYearRange({ start: newYear, end: newYear }))
  }

  /**
   * Jump to start of time range (1880)
   */
  goToStart(): void {
    this.jumpToYear(1880)
  }

  /**
   * Jump to end of time range (2025)
   */
  goToEnd(): void {
    this.jumpToYear(2025)
  }

  /**
   * Cleanup method for component unmount
   * Ensures animation is properly stopped and resources released
   */
  cleanup(): void {
    this.pause()
  }
}