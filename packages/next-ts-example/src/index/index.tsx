import { page } from '@pure-model/next.js'

import LayoutModel from '../../models/LayoutModel'
import IndexModel from './Model'
import View from './View'

import { implCtrlContext } from '../../model-contexts/CtrlContextImpl'

const Page = page({
  contexts: (options) => {
    console.log('options', options)
    return [implCtrlContext(options)]
  },
  Models: {
    LayoutModel,
    IndexModel,
  },
})

export default Page(View)
