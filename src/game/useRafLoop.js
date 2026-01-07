import { useEffect, useRef } from 'react'

export default function useRafLoop(callback) {
  const cbRef = useRef(callback)

  // Always keep the latest callback without restarting the RAF loop
  useEffect(() => {
    cbRef.current = callback
  }, [callback])

  useEffect(() => {
    let raf
    const loop = () => {
      cbRef.current?.()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
}
