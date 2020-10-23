import React from 'react'
import type { AppProps } from 'next/app'
import '../css/main.css'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
