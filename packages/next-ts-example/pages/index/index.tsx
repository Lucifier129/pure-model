import { page } from '@pure-model/next.js'

import LayoutModel from '../../models/LayoutModel'
import IndexModel from './Model'
import View from './View'

const Page = page({
  Models: {
    LayoutModel,
    IndexModel,
  },
  preload: async ({ IndexModel }, ctx) => {
    let tab = 'all'

    if (Array.isArray(ctx.query.tab)) {
      tab = ctx.query.tab.join('')
    } else if (ctx.query.tab) {
      tab = ctx.query.tab
    }

    IndexModel.actions.setSearchParams({
      tab: tab,
    })
  },
})

export default Page(View)
