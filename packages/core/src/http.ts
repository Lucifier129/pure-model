import qs from 'qs'
import fetch from '@pure-model/isomorphic-unfetch'
import { setupEnv, setupPlatformInfo } from './env'

function isAbsoluteUrl(url: string) {
  return url.startsWith('http') || url.startsWith('//')
}

export const setupFetch = () => {
  let env = setupEnv()
  let platformInfo = setupPlatformInfo()

  let $fetch = env.fetch ?? fetch

  let resolveOptions = (options?: RequestInit) => {
    let result: RequestInit = {
      method: 'GET',
      credentials: 'include',
      ...options,
    }

    if (env.req) {
      // @ts-ignore
      result.headers = {
        ...result.headers,
        cookie: env.req.headers.cookie || '',
      }
    }

    return result
  }

  let resolveUrl = (url: string) => {
    if (!isAbsoluteUrl(url) && !url.startsWith('/')) {
      url = '/' + url
    }

    if (url.startsWith('//')) {
      if (platformInfo.NodeJS) {
        url = 'http:' + url
        // tslint:disable-next-line: strict-type-predicates
      } else if (typeof location !== 'undefined' && typeof location.protocol === 'string') {
        url = location.protocol + url
      } else {
        url = 'https:' + url
      }
    }

    return url
  }

  let fetcher: typeof fetch = (url, options) => {
    if (typeof url === 'string') {
      url = resolveUrl(url)
    }

    options = resolveOptions(options)

    return $fetch(url, options)
  }

  return fetcher
}

export const setupGetJSON = () => {
  let fetch = setupFetch()

  let getJSON = async (url: string, params?: object, options?: RequestInit) => {
    if (params) {
      let prefix = url.includes('?') ? '&' : '?'
      url += prefix + qs.stringify(params)
    }

    let response = await fetch(url, {
      ...options,
      method: 'GET',
    })

    let text = await response.text()

    return JSON.parse(text)
  }

  return getJSON
}

export const setupPostJSON = () => {
  let fetch = setupFetch()

  let postJSON = async (url: string, data?: object, options?: RequestInit) => {
    let response = await fetch(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
      headers: {
        ...(options && options.headers),
        'Content-Type': 'application/json',
      },
    })

    let text = await response.text()

    return JSON.parse(text)
  }

  return postJSON
}
