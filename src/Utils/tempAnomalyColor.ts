    export default function getTempAnomalyColor(value: number): string {
        if (value === null) return 'rgba(128, 128, 128, 0.2)' // Gris transparent

        // Échelle de -3°C à +3°C (plus réaliste)
        const clampedValue = Math.max(-4, Math.min(4, value))
        const normalized = clampedValue / 3

        if (normalized < -0.1) {
        // Bleu intense pour froid
        const intensity = Math.abs(normalized)
        return `rgb(${Math.floor(50 * (1 - intensity))}, ${Math.floor(100 * (1 - intensity))}, ${255})`
        } else if (normalized > 0.1) {
        // Rouge/orange intense pour chaud
        const intensity = normalized
        return `rgb(${255}, ${Math.floor(100 * (1 - intensity))}, ${Math.floor(50 * (1 - intensity))})`
        } else {
        // Jaune/neutre pour proche de 0
        return 'rgba(255, 255, 150, 0.6)'
        }
    }