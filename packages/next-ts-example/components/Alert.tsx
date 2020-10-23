import React from 'react'
import LayoutModel from '../models/LayoutModel'

export default function Alert() {
  let { alertText } = LayoutModel.useState()

  if (!alertText) return null

  return (
    <div id="wxAlert" className="wx_loading">
      <div id="wx_alert_inner" className="wx_alert_inner">
        {alertText}
      </div>
    </div>
  )
}
