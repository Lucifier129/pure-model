/**
 * Model
 */
import { setupStore, setupPreloadCallback } from '@pure-model/core'
import { createReactModel } from '@pure-model/react'
import { setupPageContext } from '@pure-model/next.js'

import { setupGetJSON } from '../../model-hooks/http'

export type Topic = {
  id: string
  author_id: string
  tab: string
  content: string
  title: string
  last_reply_at: string
  good: boolean
  top: boolean
  reply_count: number
  visit_count: number
  create_at: string
  author: {
    loginname: string
    avatar_url: string
  }
}

export type SearchParams = {
  page: number
  limit: number
  tab: string
  mdrender: boolean
}

export type State = {
  pageTitle: string
  topics: Topic[]
  searchParams: SearchParams
}

export const initialState: State = {
  pageTitle: '首页',
  // 主题列表
  topics: [],
  // 请求参数
  searchParams: {
    page: 1,
    limit: 20,
    tab: 'all',
    mdrender: true,
  },
}

export default createReactModel(() => {
  let { store, actions } = setupStore({
    name: 'IndexModel',
    initialState: initialState,
    logger: true,
    reducers: {
      /**
       * 更新查询参数
       */
      setSearchParams: (state: State, searchParams: Partial<SearchParams>) => {
        return {
          ...state,
          searchParams: {
            ...state.searchParams,
            ...searchParams,
          },
        }
      },
      setTopics: (state: State, topics: Topic[]) => {
        return {
          ...state,
          topics,
        }
      },
      /**
       * 添加主题列表
       */
      addTopics: (state: State, topics: Topic[]) => {
        let newTopics = state.topics.concat(topics)
        return {
          ...state,
          topics: newTopics.filter((topic, index) => {
            return newTopics.indexOf(topic) === index
          }),
        }
      },
    },
  })

  let getJSON = setupGetJSON()

  let getTopics = async (searchParams: SearchParams) => {
    let json = (await getJSON('/topics', searchParams)) as { data: Topic[] }
    return json.data
  }

  let getCurrentTopics = async () => {
    let { searchParams } = store.getState()

    let topics = await getTopics(searchParams)

    actions.setTopics(topics)
  }

  let getNextTopics = async () => {
    let { searchParams } = store.getState()
    let nextSearchParams = {
      ...searchParams,
      page: searchParams.page + 1,
    }

    let topics = await getTopics(nextSearchParams)

    actions.setSearchParams(nextSearchParams)
    actions.addTopics(topics)
  }

  let ctx = setupPageContext()

  let initSearchParams = () => {
    if (!ctx) return

    let tab = 'all'
    if (Array.isArray(ctx.query.tab)) {
      tab = ctx.query.tab.join('')
    } else if (ctx.query.tab) {
      tab = ctx.query.tab
    }

    actions.setSearchParams({
      tab: tab,
    })
  }

  setupPreloadCallback(async () => {
    initSearchParams()
    await getCurrentTopics()
  })

  return {
    store,
    actions: {
      ...actions,
      getCurrentTopics,
      getNextTopics,
    },
  }
})
