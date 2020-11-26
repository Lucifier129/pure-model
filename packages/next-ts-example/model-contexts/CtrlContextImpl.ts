import { GetContextsOptions } from '@pure-model/next.js'
import { CtrlContext } from '../model-contexts/CtrlContext'
export const implCtrlContext = (options: GetContextsOptions) => {
  return CtrlContext.create({
    redirect: (url) => {
      if (options.isServer) {
        let res = options.ctx?.res
        if (!res) return

        res.statusCode = 302
        res.setHeader('Content-Type', 'text/plain')
        res.setHeader('Location', url)
        res.end('Redirecting to ' + url)
      } else {
        window.location.replace(url)
      }
    },
  })
}
