import React from 'react'
import LayoutModel from '../models/LayoutModel'

export default function Loading() {
  let { loadingText } = LayoutModel.useState()
  if (!loadingText) return null
  return (
    <div id="wxloading" className="wx_loading">
      <div className="wx_loading_inner">
        <i className="wx_loading_icon" />
        {loadingText}
      </div>
    </div>
  )
}
