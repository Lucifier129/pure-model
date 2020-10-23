import React from 'react'
import classnames from 'classnames'
import Link from 'next/link'
import { useRouter } from 'next/router'
import LayoutModel from '../models/LayoutModel'
import UserInfoUI from './UserInfo'

export default function Menu() {
  let { showMenu } = LayoutModel.useState()
  let actions = LayoutModel.useActions()

  let className = classnames({
    'nav-list': true,
    show: showMenu,
  })

  return (
    <section id="sideBar" className={className} onClick={() => actions.closeMenu()}>
      <UserInfoUI />
      <ul className="list-ul">
        <MenuItem className="icon-quanbu iconfont" to={`/index?tab=all`}>
          全部
        </MenuItem>
        <MenuItem className="icon-hao iconfont" to={`/index?tab=good`}>
          精华
        </MenuItem>
        <MenuItem className="icon-fenxiang iconfont" to={`/index?tab=share`}>
          分享
        </MenuItem>
        <MenuItem className="icon-wenda iconfont" to={`/index?tab=ask`}>
          问答
        </MenuItem>
        <MenuItem className="icon-zhaopin iconfont" to={`/index?tab=job`}>
          招聘
        </MenuItem>
        <MenuItem className="icon-xiaoxi iconfont line" to={`/message`}>
          消息
        </MenuItem>
        <MenuItem className="icon-about iconfont" to={`/about`}>
          关于
        </MenuItem>
      </ul>
    </section>
  )
}

function MenuItem(props: { className: string; to: string; children: any }) {
  let router = useRouter()

  if (props.to === router.asPath) {
    let { to, ...rest } = props
    return <li {...rest} />
  }

  let { to, children, ...rest } = props

  return (
    <li {...rest}>
      <Link href={props.to}>{children}</Link>
    </li>
  )
}
