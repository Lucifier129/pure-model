import * as Core from '@pure-model/core'

const restapi = 'https://cnodejs.org/api/v1'

export const setupGetJSON: typeof Core.setupGetJSON = () => {
  let getJSON = Core.setupGetJSON()

  return (url, params, options) => {
    return getJSON(restapi + url, params, {
      credentials: 'same-origin',
      ...options,
    })
  }
}

export const setupPostJSON: typeof Core.setupPostJSON = () => {
  let postJSON = Core.setupPostJSON()

  return (url, body, options) => {
    return postJSON(restapi + url, body, {
      credentials: 'same-origin',
      ...options,
    })
  }
}
