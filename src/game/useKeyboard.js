import { useEffect, useRef } from 'react'

export default function useKeyboard() {
  const keys = useRef({})

  useEffect(() => {
    const down = (e) => { keys.current[e.key] = true }
    const up = (e) => { keys.current[e.key] = false }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return keys
}
