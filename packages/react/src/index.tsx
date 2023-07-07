import React, {
  useContext,
  useState as useReactState,
  useReducer,
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import {
  Store,
  Initializer,
  Model,
  InitializerState,
  InitializerActions,
  createPureModel,
  CreatePureModelOptions,
  ModelContextValue,
  identity,
  shallowEqual,
  PureModelContainer,
  createPureModelContainer,
} from '@pure-model/core'

const useIsomorphicLayoutEffect =
  // tslint:disable-next-line: strict-type-predicates
  typeof window !== 'undefined' &&
  // tslint:disable-next-line: strict-type-predicates
  typeof window.document !== 'undefined' &&
  // tslint:disable-next-line: deprecation & strict-type-predicates
  typeof window.document.createElement !== 'undefined'
    ? useLayoutEffect
    : useEffect

export type ReactModel<I extends Initializer = any> = {
  isReactModel: boolean
  useState: <TSelected = InitializerState<I>>(
    selector?: (state: InitializerState<I>) => TSelected,
    compare?: (curr: TSelected, prev: TSelected) => boolean,
  ) => TSelected
  useActions: () => InitializerActions<I>
  Provider: React.FC<{
    model?: Model<InitializerState<I>>
    context?: ModelContextValue
    preloadedState?: InitializerState<I>
    container?: PureModelContainer
    fallback?: React.ReactNode
  }>
  preload: (
    context?: ModelContextValue,
    preloadedState?: InitializerState<I>,
    container?: PureModelContainer,
  ) => Promise<{
    Provider: React.FC
    state: InitializerState<I>
    model: Model<InitializerState<I>>
  }>
  create: I
  initializer: I
}

export type ReactModelInitializer<RM extends ReactModel> = RM extends ReactModel<infer I> ? I : never

export type ReactModelState<RM extends ReactModel> = InitializerState<ReactModelInitializer<RM>>

const DefaultValue = Symbol('default-value')

type DefaultValue = typeof DefaultValue

export const createReactModel = <I extends Initializer>(initializer: I): ReactModel<I> => {
  type State = InitializerState<I>
  type Value = {
    store: Store<State>
    actions: InitializerActions<I>
  }

  let ReactContext = React.createContext<Value | null>(null)

  let useState: ReactModel<I>['useState'] = (selector = identity, compare = shallowEqual) => {
    type Selector = typeof selector
    type SelectedState = ReturnType<Selector>
    let ctx = useContext(ReactContext)

    if (ctx === null) {
      throw new Error(`You may forget to attach Provider to component tree before calling Model.useState()`)
    }

    let { store } = ctx
    // modified from react-redux useSelector
    let [_, forceRender] = useReducer((s) => s + 1, 0)

    let latestSubscriptionCallbackError = useRef<Error | null>(null)
    let latestSelector = useRef<Selector | null>(null)
    let latestStoreState = useRef<State | DefaultValue>(DefaultValue)
    let latestSelectedState = useRef<SelectedState | DefaultValue>(DefaultValue)

    let storeState = store.getState()
    let selectedState: SelectedState | DefaultValue = DefaultValue

    try {
      if (
        selector !== latestSelector.current ||
        storeState !== latestStoreState.current ||
        latestSubscriptionCallbackError.current
      ) {
        selectedState = selector(storeState)
      } else {
        selectedState = latestSelectedState.current
      }
    } catch (err: any) {
      if (latestSubscriptionCallbackError.current) {
        err.message += `\nThe error may be correlated with this previous error:\n${latestSubscriptionCallbackError.current.stack}\n\n`
      }

      throw err
    }

    useIsomorphicLayoutEffect(() => {
      latestSelector.current = selector
      latestStoreState.current = storeState
      latestSelectedState.current = selectedState
      latestSubscriptionCallbackError.current = null
    })

    useIsomorphicLayoutEffect(() => {
      let isUnmounted = false
      let checkForUpdates = () => {
        if (!latestSelector.current) return
        if (isUnmounted) return

        if (latestSelectedState.current === DefaultValue) {
          throw new Error(`latestSelectedState should not be default value`)
        }

        try {
          let storeState = store.getState()
          let newSelectedState = latestSelector.current(storeState)

          if (compare(newSelectedState, latestSelectedState.current)) {
            return
          }

          latestSelectedState.current = newSelectedState
          latestStoreState.current = storeState
        } catch (err: any) {
          // we ignore all errors here, since when the component
          // is re-rendered, the selectors are called again, and
          // will throw again, if neither props nor store state
          // changed
          latestSubscriptionCallbackError.current = err
        }

        forceRender()
      }
      let unsubscribe = store.subscribe(checkForUpdates)

      return () => {
        isUnmounted = true
        unsubscribe()
      }
    }, [store])

    if (selectedState === DefaultValue) {
      throw new Error(`selectedState should not be default value`)
    }

    return selectedState
  }

  let useActions = () => {
    let ctx = useContext(ReactContext)
    if (ctx === null) {
      throw new Error(`You may forget to attach Provider to component tree before calling Model.useActions()`)
    }
    return ctx.actions
  }

  let Provider: ReactModel<I>['Provider'] = (props) => {
    let { children, context, preloadedState, container } = props

    let model = useMemo(() => {
      if (props.model) return props.model
      let options = { context, preloadedState, container }
      return createPureModel(initializer, options)
    }, [])

    let value = useMemo(() => {
      return {
        store: model.store,
        actions: model.actions,
      }
    }, [model])

    let [isReady, setReady] = useReactState(() => {
      return model.isPreloaded()
    })

    useIsomorphicLayoutEffect(() => {
      let isUnmounted = false

      if (!model.isPreloaded()) {
        // tslint:disable-next-line: no-floating-promises
        model.preload().then(() => {
          if (isUnmounted) return
          setReady(true)
          model.start()
        })
      } else if (!model.isStarted()) {
        model.start()
      }

      return () => {
        isUnmounted = true
        if (model.isStarted()) {
          model.finish()
        }
      }
    }, [])

    if (!isReady) return <>{props.fallback ?? null}</>

    return <ReactContext.Provider value={value as Value}>{children}</ReactContext.Provider>
  }

  let preload: ReactModel<I>['preload'] = async (context, preloadedState, container) => {
    let model = createPureModel(initializer, { context, preloadedState, container })

    await model.preload()

    let state = model.store.getState()

    let PreloadedProvider: React.FC = ({ children }) => {
      return (
        <Provider model={model} context={context}>
          {children}
        </Provider>
      )
    }

    return { Provider: PreloadedProvider, state, model }
  }

  return {
    isReactModel: true,
    useState,
    useActions,
    Provider,
    preload,
    create: initializer,
    initializer,
  }
}

export type ReactModels = {
  [key: string]: ReactModel
}

export type ReactModelArgs = {
  Model: ReactModel
  context?: ModelContextValue
  preloadedState?: any
}

export type ProviderProps = {
  list: ReactModelArgs[]
  children: React.ReactNode
  fallback?: React.ReactNode
  container?: PureModelContainer
}

export const Provider = ({ list, children, fallback, container }: ProviderProps) => {
  let [state, setState] = useReactState<{ Provider: React.FC } | null>(null)

  useIsomorphicLayoutEffect(() => {
    let isUnmounted = false

    preload(list, container).then((result) => {
      if (isUnmounted) return
      setState({
        Provider: result.Provider,
      })
    })

    return () => {
      isUnmounted = true
    }
  }, [])

  let Provider = state?.Provider

  if (!Provider) return <>{fallback ?? null}</>

  return <Provider>{children}</Provider>
}

export type HydrateProviderProps = ProviderProps

export const HydrateProvider = ({
  list,
  children,
  fallback,
  container = createPureModelContainer(),
}: HydrateProviderProps) => {
  for (const item of list) {
    container.set(item.Model, {
      context: item.context,
      preloadedState: item.preloadedState,
    })
    children = (
      <item.Model.Provider
        context={item.context}
        preloadedState={item.preloadedState as any}
        container={container}
        fallback={fallback}
      >
        {children}
      </item.Model.Provider>
    )
  }

  return <>{children}</>
}

type CombinedReactModelState<T extends ReactModelArgs[]> = ReactModelState<T[number]['Model']>[]

type PreloadResultType<T extends ReactModelArgs[]> = Promise<{
  Provider: React.FC
  stateList: CombinedReactModelState<T>
  modelList: Model[]
}>

export const preload = async <T extends ReactModelArgs[]>(list: T, container?: PureModelContainer) => {
  container = container ?? createPureModelContainer()

  for (const item of list) {
    container.set(item.Model, {
      context: item.context,
      preloadedState: item.preloadedState,
    })
  }

  let resultList = await Promise.all(
    list.map((item) => {
      let { Model, context, preloadedState } = item
      return Model.preload(context, preloadedState, container)
    }),
  )

  let ProviderList = resultList.map((item) => item.Provider)
  let stateList = resultList.map((item) => item.state)
  let modelList = resultList.map((item) => item.model)

  let Provider: React.FC = ({ children }) => {
    for (let i = ProviderList.length - 1; i >= 0; i--) {
      let Provider = ProviderList[i]
      children = <Provider>{children}</Provider>
    }

    return <>{children}</>
  }

  return ({
    Provider,
    stateList: stateList,
    modelList,
  } as unknown) as PreloadResultType<T>
}

export const useReactModel = <RM extends ReactModel>(
  ReactModel: RM,
  options?: CreatePureModelOptions<ReactModelInitializer<RM>> & {
    onError?: (error: Error) => any
  },
): [InitializerState<ReactModelInitializer<RM>>, InitializerActions<ReactModelInitializer<RM>>] => {
  let model = useMemo(() => {
    let model = createPureModel(ReactModel.create, options)
    return model as Model
  }, [])

  let [state, setState] = useReactState(() => model.store.getState() as InitializerState<ReactModelInitializer<RM>>)

  useIsomorphicLayoutEffect(() => {
    let isUnmounted = false

    let unsubscribe = model.store.subscribe(() => {
      setState(model.store.getState())
    })

    if (!model.isPreloaded()) {
      model
        .preload()
        .then(() => {
          if (isUnmounted) return
          model.start()
        })
        .catch(options?.onError)
    } else if (!model.isStarted()) {
      model.start()
    }

    return () => {
      isUnmounted = true
      unsubscribe()
      if (model.isStarted()) {
        model.finish()
      }
    }
  }, [])

  return [state, model.actions as InitializerActions<ReactModelInitializer<RM>>]
}

type Constructor = new (...args: any[]) => any

const createReactModelArgs = <MS extends ReactModels, Renderable extends Constructor & ModelContextValue>(
  Models: MS,
  renderable: Renderable,
) => {
  let list: ReactModelArgs[] = Object.values(Models).map((Model) => {
    return {
      Model,
      context: renderable,
    }
  })
  return list
}

export const provide = <MS extends ReactModels>(Models: MS) => <C extends Constructor>(Renderable: C) => {
  return class extends Renderable {
    ReactModelArgs = createReactModelArgs(Models, this as any)

    render() {
      return <Provider list={this.ReactModelArgs as any}>{super.render()}</Provider>
    }
  }
}
