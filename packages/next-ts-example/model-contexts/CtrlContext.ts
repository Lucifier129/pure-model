import { createModelContext, setupContext } from '@pure-model/core'

export type CtrlContext = {
  redirect(url: string): void
}

export const CtrlContext = createModelContext<CtrlContext>({
  redirect() {},
})

export const setupCtrl = () => {
  let ctrl = setupContext(CtrlContext)
  return ctrl
}
