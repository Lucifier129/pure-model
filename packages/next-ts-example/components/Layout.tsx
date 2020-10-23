import React, { ReactNode } from 'react'
import Header from './Header'
import BackToTop from './BackToTop'
import Alert from './Alert'
import Loading from './Loading'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: '100%', background: '#fff' }}>
      <Header />
      {children}
      <BackToTop />
      <Alert />
      <Loading />
    </div>
  )
}
