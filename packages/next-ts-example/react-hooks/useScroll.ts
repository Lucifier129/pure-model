import { useEffect, useRef } from 'react'

export type ScrollHandler = (info: { scrollX: number; scrollY: number }) => any

export const useScroll = (scrollHandler: ScrollHandler) => {
  let scrollHandlerRef = useRef<ScrollHandler>(scrollHandler)

  useEffect(() => {
    let handleScroll = () => {
      let { scrollX, scrollY } = window
      scrollHandlerRef.current({
        scrollX,
        scrollY,
      })
    }

    window.addEventListener('scroll', handleScroll, false)

    return () => {
      window.removeEventListener('scroll', handleScroll, false)
    }
  }, [scrollHandlerRef])

  useEffect(() => {
    scrollHandlerRef.current = scrollHandler
  }, [scrollHandler])
}
