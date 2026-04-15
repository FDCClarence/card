import { useEffect, useRef } from 'react'

interface Star {
  /** Normalised position (0–1) so resize is free */
  x: number
  y: number
  radius: number
  baseOpacity: number
  phase: number
  twinkleRate: number
}

const STAR_COUNT = 90

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Seed stars with normalised coords
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 1.2 + 0.25,
      baseOpacity: Math.random() * 0.55 + 0.08,
      phase: Math.random() * Math.PI * 2,
      twinkleRate: 0.2 + Math.random() * 0.4,
    }))

    let rafId = 0

    function draw(now: number) {
      const elapsed = now / 1000

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const star of stars) {
        const opacity = prefersReduced
          ? star.baseOpacity
          : star.baseOpacity *
            (0.5 + 0.5 * Math.sin(elapsed * star.twinkleRate * Math.PI * 2 + star.phase))

        ctx.globalAlpha = Math.max(0, opacity)
        ctx.beginPath()
        ctx.arc(star.x * canvas.width, star.y * canvas.height, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      }

      ctx.globalAlpha = 1

      if (!prefersReduced) {
        rafId = requestAnimationFrame(draw)
      }
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.38,
      }}
    />
  )
}
