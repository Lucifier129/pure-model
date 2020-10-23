import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import LayoutModel, { UserInfo } from '../models/LayoutModel'

export default function UserInfoUI() {
  let router = useRouter()
  let { userInfo } = LayoutModel.useState()

  return (
    <div className="user-info">
      {!!userInfo && <User userInfo={userInfo} />}
      {!userInfo && <Login redirect={router.asPath} />}
      {!!userInfo && (
        <Logout
          onLogout={() => {
            console.log('logout')
          }}
        />
      )}
    </div>
  )
}

function Login(props: { redirect: string }) {
  return (
    <ul className="login-no">
      <li className="login">
        <Link href={`/login?redirect=${props.redirect}`}>登录</Link>
      </li>
    </ul>
  )
}

function Logout(props: { onLogout: () => any }) {
  return (
    <ul className="login-no">
      <li className="login" onClick={props.onLogout}>
        退出
      </li>
    </ul>
  )
}

function User(props: { userInfo: UserInfo }) {
  let { loginname, avatar_url } = props.userInfo
  return (
    <div className="login-yes">
      <Link href={`/user/${loginname}`}>
        <div>
          <div className="avertar">{avatar_url && <img src={avatar_url} />}</div>
          <div className="info">{loginname && <p>{loginname}</p>}</div>
        </div>
      </Link>
    </div>
  )
}
