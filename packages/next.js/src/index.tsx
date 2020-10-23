import React, { useMemo } from 'react'

import { ModelContextValue, EnvContext, mergeModelContext, createPureModel, Initializer } from '@pure-model/core'

import { Provider, ReactModels, ReactModelInitilizer } from '@pure-model/react'

import type { NextPage, NextPageContext } from 'next'

export type PageModels<T extends ReactModels> = {
  [key in keyof T]: ReturnType<ReactModelInitilizer<T[key]>>
}

export type PageOptions<T extends ReactModels> = {
  Models: T
  preload?: (models: PageModels<T>, ctx: NextPageContext) => Promise<void>
  contexts?: ModelContextValue[]
}

export const page = <T extends ReactModels>(options: PageOptions<T>) => {
  let fixedContext = mergeModelContext(...(options.contexts ?? []))
  let uid = 0

  return function <Props = {}, InitialProps = Props>(InputComponent: NextPage<Props, InitialProps>) {
    type PageInitialProps = InitialProps & {
      __STATE_LIST__?: any[]
    }

    const Page = (props: PageInitialProps) => {
      let { __STATE_LIST__, ...rest } = props
      let ReactModelArgs = useMemo(() => {
        return Object.values(options.Models).map((Model, index) => {
          let preloadedState = __STATE_LIST__?.[index]
          return {
            Model,
            context: fixedContext,
            preloadedState,
          }
        })
      }, [__STATE_LIST__])

      let key = useMemo(() => {
        return uid++
      }, [ReactModelArgs])

      let Component: any = InputComponent

      return (
        <Provider key={key} list={ReactModelArgs}>
          <Component {...rest} />
        </Provider>
      )
    }

    Page.getInitialProps = async (ctx: NextPageContext) => {
      let initialProps = await InputComponent.getInitialProps?.(ctx)

      let env = EnvContext.create({
        req: ctx.req,
        res: ctx.res,
      })

      let context = mergeModelContext(env, fixedContext)

      let modelList = Object.values(options.Models).map((Model) => {
        return createPureModel(Model.create as Initializer, {
          context,
        })
      })

      let models = {}

      Object.keys(options.Models).forEach((key, index) => {
        let model = modelList[index]
        models[key] = model
      })

      await options.preload?.(models as PageModels<T>, ctx)

      await Promise.all(modelList.map((model) => model.preload()))

      let __STATE_LIST__ = modelList.map((model) => model.store.getState())

      return {
        ...initialProps,
        __STATE_LIST__,
      }
    }

    return (Page as unknown) as NextPage<Props, PageInitialProps>
  }
}
