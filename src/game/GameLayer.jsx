// src/game/GameLayer.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import useKeyboard from './useKeyboard'
import useRafLoop from './useRafLoop'
import { LEVEL } from './levelConfig'

const CHAR_W = 32
const CHAR_H = 48

const SPEED_X = 4
const JUMP_V = 16
const GRAVITY = 0.9
const TOWER_LEFT = 60
const TOWER_RIGHT = 60


const CAMERA_TARGET_Y = 0.6 // keep character around 60% down the screen
const CLIMB_SPEED = 4

// RIGHT-SIDE LADDER (global column)
const LADDER_W = 54
const LADDER_MARGIN_RIGHT = 70

// If a floor has no platforms defined, we’ll still place an implicit “stand line”
const DEFAULT_PLATFORM_Y_OFFSET = 260

// Auto-ladder (when user scrolls in browse mode)
const SCROLL_STOP_DELAY_MS = 180

// Debug visuals
const SHOW_DEBUG_PLATFORMS = true
const SHOW_DEBUG_LADDERS = true

export default function GameLayer({ zones }) {
  const keys = useKeyboard()

  // Focus-to-control:
  // - not focused: user scrolls/clicks normally; character can auto-ride ladder while scrolling
  // - focused: arrows control character physics; page scroll follows camera
  const [isFocused, setIsFocused] = useState(false)

  // World state (document-space)
  const xRef = useRef(200)
  const yRef = useRef(0)
  const vyRef = useRef(0)
  const onGroundRef = useRef(false)

  // Render state (screen-space for drawing)
  const [render, setRender] = useState({ x: 200, y: 0 })

  // World objects (platforms + ladders) in world-space
  const objectsRef = useRef([])

  // Auto-ladder control while scrolling in browse mode
  const autoLadderRef = useRef(false)
  const scrollStopTimerRef = useRef(null)

  const floorIds = useMemo(() => Object.keys(zones), [zones])

  const getLadderX1 = () => Math.max(0, window.innerWidth - LADDER_MARGIN_RIGHT - LADDER_W)
  const getLadderX2 = () => getLadderX1() + LADDER_W
  const getLadderXCenter = () => getLadderX1() + LADDER_W / 2 - CHAR_W / 2

  const rebuildWorld = () => {
    const objects = []

    // Platforms per floor from LEVEL config
    for (const id of floorIds) {
      const ref = zones[id]
      if (!ref?.current) continue

      const top = ref.current.offsetTop
      const cfg = LEVEL[id] ?? { platforms: [] }
      // Guaranteed base ledge for each floor (prevents soft-lock)
      const ladderX1 = getLadderX1()
const platformLeft = 80
const platformRight = ladderX1 - 10 // small gap before ladder

if (platformRight > platformLeft) {
  objects.push({
    type: 'platform',
    floor: id,
    x1: platformLeft,
    x2: platformRight,
    y: top + DEFAULT_PLATFORM_Y_OFFSET,
  })
}




      for (const p of (cfg.platforms ?? [])) {
        objects.push({
          type: 'platform',
          floor: id,
          x1: p.x,
          x2: p.x + p.w,
          y: top + p.yOffset,
        })
      }
    }

    // Global right-side ladder segments between consecutive floors (top order)
    const floorMeta = floorIds
      .map((id) => {
        const ref = zones[id]
        if (!ref?.current) return null
        const top = ref.current.offsetTop
        const cfg = LEVEL[id] ?? { platforms: [] }
        const standY = top + (cfg.platforms?.[0]?.yOffset ?? DEFAULT_PLATFORM_Y_OFFSET) - CHAR_H
        return { id, top, standY }
      })
      .filter(Boolean)
      .sort((a, b) => a.top - b.top)

    // Global right-side ladder: ONE continuous segment (no seams)
if (floorMeta.length >= 2) {
  const yTop = Math.min(...floorMeta.map(f => f.standY))
  const yBot = Math.max(...floorMeta.map(f => f.standY))

  objects.push({
    type: 'ladder',
    x1: getLadderX1(),
    x2: getLadderX2(),
    yTop,
    yBot,
  })
}


    // Stable ordering
    objects.sort((a, b) => {
      const ay = a.type === 'platform' ? a.y : a.yTop
      const by = b.type === 'platform' ? b.y : b.yTop
      return ay - by
    })

    objectsRef.current = objects

    // Spawn if needed
    const firstPlatform = objects.find((o) => o.type === 'platform')
    if (firstPlatform && yRef.current === 0) {
      yRef.current = firstPlatform.y - CHAR_H
      xRef.current = getLadderXCenter()
      vyRef.current = 0
      onGroundRef.current = true
    }
  }

  useEffect(() => {
    rebuildWorld()
    window.addEventListener('resize', rebuildWorld)
    const t = setTimeout(rebuildWorld, 250)
    return () => {
      window.removeEventListener('resize', rebuildWorld)
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorIds])

  // Toggle focus + prevent default arrow scrolling only when focused
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'g' || e.key === 'G') setIsFocused(true)
      if (e.key === 'Escape') setIsFocused(false)

      if (!isFocused) return

      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === ' ' ||
        e.key === 'Enter'
      ) {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', onKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFocused])

  // Detect active scrolling (browse mode) to enable auto-ladder teleport while scrolling
  useEffect(() => {
    const onScroll = () => {
      if (isFocused) return
      autoLadderRef.current = true

      if (scrollStopTimerRef.current) clearTimeout(scrollStopTimerRef.current)
      scrollStopTimerRef.current = setTimeout(() => {
        autoLadderRef.current = false
      }, SCROLL_STOP_DELAY_MS)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollStopTimerRef.current) clearTimeout(scrollStopTimerRef.current)
    }
  }, [isFocused])

  // Landing detection: cross a platform from above while falling
  const findLandingPlatform = (x, prevBottom, nextBottom) => {
    for (const o of objectsRef.current) {
      if (o.type !== 'platform') continue
      const withinX = x + CHAR_W > o.x1 && x < o.x2
      const crossed = prevBottom <= o.y && nextBottom >= o.y
      if (withinX && crossed) return o
    }
    return null
  }

  // Ladder detection: overlap ladder column + within y-range
  const getLadder = (x, y) => {
    for (const o of objectsRef.current) {
      if (o.type !== 'ladder') continue
      const withinX = x + CHAR_W > o.x1 && x < o.x2
      const withinY = y >= o.yTop - 40 && y <= o.yBot + 40
      if (withinX && withinY) return o
    }
    return null
  }

  useRafLoop(() => {
    let x = xRef.current
    let y = yRef.current
    let vy = vyRef.current

    const targetScreenY = window.innerHeight * CAMERA_TARGET_Y

    // ===== Browse mode =====
    if (!isFocused) {
      if (autoLadderRef.current) {
        // While the user is actively scrolling: teleport to ladder and “ride” scroll
        const ladderX = getLadderXCenter()
        xRef.current = ladderX
        yRef.current = window.scrollY + targetScreenY
        vyRef.current = 0
        onGroundRef.current = false
        setRender({ x: ladderX, y: targetScreenY })
      } else {
        // Not scrolling: just render wherever you last were (often on ladder after auto ride)
        setRender({ x: xRef.current, y: yRef.current - window.scrollY })
      }
      return
    }

    // ===== Game focus mode (physics) =====

    // Horizontal movement
    if (keys.current.ArrowLeft) x -= SPEED_X
    if (keys.current.ArrowRight) x += SPEED_X
    const minX = TOWER_LEFT
    const maxX = window.innerWidth - TOWER_RIGHT - CHAR_W
    x = Math.max(minX, Math.min(maxX, x))


    // Ladder behaviour:
    // - If you hold Up/Down while overlapping ladder: attach + climb (and clamp y to ladder segment)
    // - If you release Up/Down while still overlapping ladder: you DO NOT fall (vy=0), and you can step off left/right
    const ladderNow = getLadder(x, y)
    const onLadder = !!ladderNow
    const climbUp = keys.current.ArrowUp
    const climbDown = keys.current.ArrowDown
    const wantsClimb = onLadder && (climbUp || climbDown)

    if (onLadder) {
      // Stick (no gravity) whenever on ladder
      vy = 0
      onGroundRef.current = false

      if (wantsClimb) {
        // While climbing, snap/attach horizontally into the ladder column
        x = Math.max(ladderNow.x1, Math.min(ladderNow.x2 - CHAR_W, x))

        if (climbUp) y -= CLIMB_SPEED
        if (climbDown) y += CLIMB_SPEED

        // Clamp within ladder segment while actively climbing
        y = Math.max(ladderNow.yTop, Math.min(ladderNow.yBot, y))
      } else {
        // Not climbing: allow stepping off freely (no x clamp), keep y frozen (no falling)
      }
    } else {
      // Normal platform physics
      if ((keys.current[' '] || keys.current.ArrowUp) && onGroundRef.current) {
        vy = -JUMP_V
        onGroundRef.current = false
      }

      vy += GRAVITY

      const prevBottom = y + CHAR_H
      const nextY = y + vy
      const nextBottom = nextY + CHAR_H

      const landing = vy > 0 ? findLandingPlatform(x, prevBottom, nextBottom) : null
      if (landing) {
        y = landing.y - CHAR_H
        vy = 0
        onGroundRef.current = true
      } else {
        y = nextY
        onGroundRef.current = false
      }
    }

    // Save back
    xRef.current = x
    yRef.current = y
    vyRef.current = vy

    // Camera follow: scroll the page to follow character
    const cameraY = Math.max(0, y - targetScreenY)
    window.scrollTo({ top: cameraY, behavior: 'auto' })

    // Render
    setRender({ x, y: y - window.scrollY })
  })

  const platforms = objectsRef.current.filter((o) => o.type === 'platform')
  const ladders = objectsRef.current.filter((o) => o.type === 'ladder')
  const floorTops = floorIds
  .map((id) => {
    const ref = zones[id]
    if (!ref?.current) return null
    return { id, top: ref.current.offsetTop }
  })
  .filter(Boolean)
  .sort((a, b) => a.top - b.top)


  return (
    <div className="game-layer">
        {/* Tower walls */}
<div
  style={{
    position: 'fixed',
    left: 'var(--tower-left)',
    top: 0,
    width: 10,
    height: '100vh',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    pointerEvents: 'none',
  }}
/>
<div
  style={{
    position: 'fixed',
    right: 'var(--tower-right)',
    top: 0,
    width: 10,
    height: '100vh',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    pointerEvents: 'none',
  }}
/>
{/* Floor separator lines (at each section top) */}
{floorTops.map((f) => (
  <div
    key={`floorline-${f.id}`}
    style={{
      position: 'fixed',
      left: 60,
      right: 60,
      top: f.top - window.scrollY,
      height: 2,
      background: 'rgba(0,0,0,0.10)',
      pointerEvents: 'none',
    }}
  />
))}


      {/* Debug visuals */}
      {SHOW_DEBUG_PLATFORMS &&
        platforms.map((p, i) => (
          <div
            key={`plat-${i}`}
            style={{
              position: 'fixed',
              left: p.x1,
              top: p.y - window.scrollY,
              width: p.x2 - p.x1,
              height: 10,
              background: 'rgba(0,0,0,0.12)',
              borderRadius: 6,
              pointerEvents: 'none',
            }}
          />
        ))}

      {SHOW_DEBUG_LADDERS &&
        ladders.map((l, i) => (
          <div
            key={`lad-${i}`}
            style={{
              position: 'fixed',
              left: l.x1,
              top: l.yTop - window.scrollY,
              width: l.x2 - l.x1,
              height: l.yBot - l.yTop,
              background: 'rgba(0,0,0,0.08)',
              borderRadius: 6,
              pointerEvents: 'none',
            }}
          />
        ))}

      <div
        className="character"
        onClick={() => setIsFocused(true)}
        style={{
          pointerEvents: 'auto',
          transform: `translate(${render.x}px, ${render.y}px)`,
          cursor: isFocused ? 'default' : 'pointer',
          outline: isFocused ? '2px solid rgba(0,0,0,0.25)' : 'none',
        }}
        title={isFocused ? 'Game controls active (Esc to exit)' : 'Click to play (or press G)'}
      />

      <div
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontSize: 12,
          padding: '6px 8px',
          borderRadius: 6,
          pointerEvents: 'none',
          maxWidth: 380,
          textAlign: 'right',
        }}
      >
        {isFocused
          ? 'Game focus: ON • Arrows move • Space/Up jump • Hold Up/Down on ladder to climb • Let go = stick • Esc exit'
          : 'Browse normally • When you scroll, character teleports to right ladder and rides the scroll • Click character or press G to play'}
      </div>
    </div>
  )
}
