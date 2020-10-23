import React from 'react'
import classnames from 'classnames'
import Link from 'next/link'
import LayoutModel from '../models/LayoutModel'
import Menu from './Menu'

export default function Header() {
  let { showMenu, fixedHeader, pageTitle } = LayoutModel.useState((state) => {
    let { showMenu, fixedHeader, pageTitle } = state
    return { showMenu, fixedHeader, pageTitle }
  })

  let headClassName = classnames({
    show: showMenu && fixedHeader,
    'fix-header': fixedHeader,
    'no-fix': !fixedHeader,
  })

  return (
    <div>
      {showMenu && fixedHeader && <PageCover />}
      <header id="hd" className={headClassName}>
        <div className="nv-toolbar">
          {fixedHeader && <Toolbar />}
          <span>{pageTitle}</span>
          <Message />
        </div>
      </header>
      <Menu />
    </div>
  )
}

function PageCover() {
  let { closeMenu } = LayoutModel.useActions()
  return <div className="page-cover" onClick={() => closeMenu()} />
}

function Toolbar() {
  let { openMenu } = LayoutModel.useActions()
  return <div className="toolbar-nav" onClick={() => openMenu()} />
}

function Message() {
  let { messageCount, showAddButton } = LayoutModel.useState()

  if (messageCount > 0) {
    return <i className="num">{messageCount}</i>
  }

  if (showAddButton) {
    return (
      <Link href="/add">
        <i className="iconfont add-icon">&#xe60f;</i>
      </Link>
    )
  }

  return null
}
