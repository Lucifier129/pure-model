import { page } from '@pure-model/next.js'

import LayoutModel from '../../models/LayoutModel'
import IndexModel from './Model'
import View from './View'

const Page = page({
  Models: {
    LayoutModel,
    IndexModel,
  },
})

export default Page(View)
