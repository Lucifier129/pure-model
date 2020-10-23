import React, { useState } from 'react'
import { useScroll } from '../react-hooks/useScroll'

export default function BackToTop() {
  let [shouldShow, setStatus] = useState(false)

  let handleGoToTop = () => {
    window.scrollTo(0, 0)
  }

  useScroll((scrollInfo) => {
    if (scrollInfo.scrollY > 100) {
      if (!shouldShow) {
        setStatus(true)
      }
    } else if (shouldShow) {
      setStatus(false)
    }
  })

  if (!shouldShow) return null

  return (
    <div className="iconfont icon-top" onClick={handleGoToTop}>
      &#xe611;
    </div>
  )
}
