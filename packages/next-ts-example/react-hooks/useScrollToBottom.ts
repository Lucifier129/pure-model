import { useRef } from 'react'
import { useScroll } from './useScroll'

export const useScrollToBottom = (f: Function) => {
  let ref = useRef(false)

  useScroll(async () => {
    if (ref.current) return
    let scrollHeight = window.innerHeight + window.scrollY
    let pageHeight = document.body.scrollHeight || document.documentElement.scrollHeight

    if (pageHeight - scrollHeight <= 400) {
      ref.current = true
      try {
        await f()
      } finally {
        ref.current = false
      }
    }
  })
}
