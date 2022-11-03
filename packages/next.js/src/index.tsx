import React, { useMemo } from 'react'

import {
  ModelContextValue,
  EnvContext,
  mergeModelContext,
  createPureModel,
  Initializer,
  createModelContext,
  setupContext,
} from '@pure-model/core'

import { HydrateProvider, ReactModels, ReactModelInitilizer } from '@pure-model/react'

import type { NextPage, NextPageContext } from 'next'

export type PageModels<T extends ReactModels> = {
  [key in keyof T]: ReturnType<ReactModelInitilizer<T[key]>>
}

const isServer = typeof window === 'undefined'

export type GetContextsOptions = {
  ctx?: NextPageContext
  isServer: boolean
  getInitialProps: boolean
}

export type PageOptions<T extends ReactModels> = {
  Models: T
  preload?: (models: PageModels<T>, ctx: NextPageContext) => Promise<void>
  contexts?: ModelContextValue[] | ((options: GetContextsOptions) => ModelContextValue[])
}

export const PageContext = createModelContext<NextPageContext | null>(null)

export const setupPageContext = () => {
  let ctx = setupContext(PageContext)
  return ctx
}

export const page = <T extends ReactModels>(options: PageOptions<T>) => {
  let uid = 0

  let getOptionContexts = (contextsOptions: GetContextsOptions) => {
    if (!options.contexts) return mergeModelContext()

    if (Array.isArray(options.contexts)) {
      // @ts-ignore
      return mergeModelContext(...options.contexts)
    }

    let contexts = options.contexts(contextsOptions)

    return mergeModelContext(...contexts)
  }

  return function <Props = {}, InitialProps = Props>(InputComponent: NextPage<Props, InitialProps>) {
    type PageInitialProps = InitialProps & {
      __STATE_LIST__?: any[]
    }

    const Page = (props: PageInitialProps) => {
      let { __STATE_LIST__, ...rest } = props

      let ReactModelArgs = useMemo(() => {
        return Object.values(options.Models).map((Model, index) => {
          let preloadedState = __STATE_LIST__?.[index]
          let optionContexts = getOptionContexts({
            getInitialProps: false,
            isServer,
          })

          return {
            Model,
            context: optionContexts,
            preloadedState,
          }
        })
      }, [__STATE_LIST__])

      let key = useMemo(() => {
        return uid++
      }, [ReactModelArgs])

      let Component: any = InputComponent

      return (
        <HydrateProvider key={key} list={ReactModelArgs as any}>
          <Component {...rest} />
        </HydrateProvider>
      )
    }

    Page.getInitialProps = async (ctx: NextPageContext) => {
      let initialProps = await InputComponent.getInitialProps?.(ctx)

      let optionContexts = getOptionContexts({
        ctx,
        getInitialProps: true,
        isServer,
      })

      let context = mergeModelContext(
        optionContexts,
        PageContext.create(ctx),
        EnvContext.create({
          req: ctx.req,
          res: ctx.res,
        }),
      )

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
