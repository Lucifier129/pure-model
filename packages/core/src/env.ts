import { createModelContext, setupContext } from './core'
import type { IncomingMessage, ServerResponse } from 'http'

export const platforms = ['NodeJS', 'Browser', 'ReactNative'] as const

export type Platform = typeof platforms[number]

export type Env = {
  platform?: Platform
  fetch?: typeof fetch
  req?: IncomingMessage
  res?: ServerResponse
}

const getUserAgent = (env: Env) => {
  if (env.req) {
    return env.req.headers['user-agent'] ? env.req.headers['user-agent'] : ''
    // tslint:disable-next-line: strict-type-predicates
  } else if (typeof window !== 'undefined') {
    return window.navigator.userAgent
  }

  return ''
}

export const setupUserAgent = () => {
  let env = setupEnv()
  return getUserAgent(env)
}

export const getPlatform = (env: Env): Platform => {
  if (env.platform) {
    return env.platform
  }

  // tslint:disable-next-line: strict-type-predicates
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return 'ReactNative'
  }

  // tslint:disable-next-line: strict-type-predicates
  if (typeof window === 'undefined' || typeof window.document === 'undefined') {
    return 'NodeJS'
  }

  return 'Browser'
}

export const EnvContext = createModelContext<Env>({})

export const setupEnv = () => {
  let env = setupContext(EnvContext)
  return env
}

export const setupPlatform = (): Platform => {
  let env = setupContext(EnvContext)
  let platform = getPlatform(env)

  return platform
}

export type PlatformInfo = {
  [key in Platform]: boolean
}

export const setupPlatformInfo = (): PlatformInfo => {
  let platform = setupPlatform()

  let info = {} as PlatformInfo

  for (let i = 0; i < platforms.length; i++) {
    let name = platforms[i]
    info[name] = name === platform
  }

  return info
}
