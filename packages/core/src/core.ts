import { createStore as createReduxStore, compose, Store, PreloadedState, applyMiddleware } from 'redux'

import { createLogger } from 'redux-logger'

import { isPlainObject, shallowEqual, forcePlainDataCheck, identity, isThenable } from './util'

export { identity, shallowEqual, isThenable }

export type { Store, PreloadedState }

export type ReducerWithoutPayload<S = any> = (state: S) => S
export type ReducerWithPayload<S = any, P = any> = (state: S, payload: P) => S
export type ReducerWithOptionalPayload<S = any, P = any> = (state: S, payload?: P) => S

export type Reducer<S = any> = ReducerWithPayload<S> | ReducerWithoutPayload<S> | ReducerWithOptionalPayload<S>

export type Reducers<S = any> = {
  [key: string]: Reducer<S>
}

type Actions = {
  [key: string]: AnyFn | Actions
}

export type Tail<T extends any[]> = ((...t: T) => any) extends (_: any, ...tail: infer TT) => any ? TT : []

export type ReducerToAction<R extends Reducer> = R extends (...args: infer Args) => any
  ? (...args: Tail<Args>) => void
  : never

export type ReducersToActions<RS extends Reducers> = {
  [key in keyof RS]: ReducerToAction<RS[key]>
}

export type CreateStoreOptions<S, RS extends Reducers<S>> = {
  name?: string
  initialState: S
  reducers: RS
  devtools?: boolean
  logger?: boolean
}

export type CreateInternalStoreOptions<S, RS extends Reducers> = CreateStoreOptions<S, RS> & {
  preloadedState?: PreloadedState<S>
}

export type ActionObject = {
  type: string
  payload?: any
}

type AnyFn = (...args: any) => any

type Hooks = {
  [key: string]: AnyFn
}

type DefaultHooks<HS extends Hooks> = {
  [key in keyof HS]: (...args: Parameters<HS[key]>) => never
}

const createHooks = <HS extends Hooks>(defaultHooks: DefaultHooks<HS>) => {
  let currentHooks: Hooks = {}

  let hooks = {} as HS

  for (let key in defaultHooks) {
    let f = ((...args) => {
      let handler = currentHooks[key]
      // tslint:disable-next-line: strict-type-predicates
      if (typeof handler !== 'function') {
        handler = defaultHooks[key]
      }
      // @ts-ignore
      return handler(...args)
    }) as HS[typeof key]

    hooks[key] = f
  }

  let run = <F extends AnyFn>(f: F, implementations: HS): ReturnType<F> => {
    try {
      currentHooks = implementations || defaultHooks
      return f()
    } finally {
      currentHooks = defaultHooks
    }
  }

  return { run, hooks }
}

export const MODEL_CONTEXT = Symbol('@pure-model/context')

export type ModelContextValue<T = any> = {
  [MODEL_CONTEXT]: {
    [key: string]: { value: T }
  }
}

export const mergeModelContext = (...args: ModelContextValue[]): ModelContextValue => {
  let mergedResult = {
    [MODEL_CONTEXT]: {},
  } as ModelContextValue

  for (let i = 0; i < args.length; i++) {
    Object.assign(mergedResult[MODEL_CONTEXT], args[i][MODEL_CONTEXT])
  }

  return mergedResult
}

export const getModelContextValue = (modelContextValue: ModelContextValue, key: string) => {
  let obj = modelContextValue[MODEL_CONTEXT]

  if (obj && obj.hasOwnProperty(key)) {
    return obj[key]
  }

  return null
}

export type ModelContext<V = any> = {
  id: string
  impl: (
    value: V,
  ) => {
    [key: string]: { value: V }
  }
  initialValue: V
  create: (value: V) => ModelContextValue<V>
}

export type ModelContextValueType<T extends ModelContext> = T extends ModelContext<infer V> ? V : never

let modelContextOffset = 0
const getModelContextId = () => modelContextOffset++

export const createModelContext = <V>(initialValue: V): ModelContext<V> => {
  let id = `@pure-model/context/${getModelContextId()}`

  let impl = (value: V) => {
    return {
      [id]: {
        value,
      },
    }
  }

  let create = (value: V) => {
    return { [MODEL_CONTEXT]: impl(value) }
  }

  return {
    id,
    initialValue,
    impl,
    create,
  }
}

export type PresetHooks = {
  setupStore: <S, RS extends Reducers<S>>(
    options: CreateStoreOptions<S, RS>,
  ) => {
    store: Store<S, ActionObject>
    actions: ReducersToActions<RS>
  }
  setupContext: <Ctx extends ModelContext>(ctx: Ctx) => ModelContextValueType<Ctx>
  setupStartCallback: (callback: Callback) => void
  setupFinishCallback: (callback: Callback) => void
  setupPreloadCallback: (callback: Callback) => void
}

let { run, hooks } = createHooks<PresetHooks>({
  setupStore() {
    throw new Error(`setupStore can't not be called after initializing`)
  },
  setupContext() {
    throw new Error(`setupContext can't not be called after initializing`)
  },
  setupStartCallback() {
    throw new Error(`setupStartCallback can't not be called after initializing`)
  },
  setupFinishCallback() {
    throw new Error(`setupFinishCallback can't not be called after initializing`)
  },
  setupPreloadCallback() {
    throw new Error(`setupPreloadCallback can't not be called after initializing`)
  },
})

export const { setupStore, setupContext, setupStartCallback, setupFinishCallback, setupPreloadCallback } = hooks

const createInternalStore = <S, RS extends Reducers<S>>(options: CreateInternalStoreOptions<S, RS>) => {
  let { reducers, initialState, preloadedState } = options

  /**
   * check initial state in non-production env
   */
  if (process.env.NODE_ENV !== 'production') {
    forcePlainDataCheck(initialState)
  }

  let reducer = (state: S = initialState, action: ActionObject) => {
    /**
     * check action in non-production env
     */
    if (process.env.NODE_ENV !== 'production') {
      forcePlainDataCheck(action)
    }

    let actionType = action.type

    if (!reducers.hasOwnProperty(actionType)) {
      return state
    }

    let update = reducers[actionType]

    let nextState = update(state, action.payload)

    /**
     * check next state in non-production env
     */
    if (process.env.NODE_ENV !== 'production') {
      forcePlainDataCheck(nextState)
    }

    return nextState
  }

  let enhancer = createReduxDevtoolsEnhancer(options.devtools, options.name, options.logger)

  let store = createReduxStore(reducer, preloadedState, enhancer)

  let actions = createActions(reducers, store.dispatch)

  return {
    store,
    actions,
  }
}

const createReduxDevtoolsEnhancer = (devtools: boolean = true, name?: string, enableLogger = false) => {
  let composeEnhancers =
    // tslint:disable-next-line: strict-type-predicates
    devtools && typeof window === 'object' && (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
          name,
        })
      : compose

  let enhancer = enableLogger ? composeEnhancers(applyMiddleware(createLogger())) : composeEnhancers()

  return enhancer
}

type Dispatch = (action: ActionObject) => ActionObject

const createActions = <RS extends Reducers>(reducers: RS, dispatch: Dispatch): ReducersToActions<RS> => {
  let actions = {} as ReducersToActions<RS>

  for (let actionType in reducers) {
    let reducer = reducers[actionType]
    let action = ((payload: any) => {
      dispatch({
        type: actionType,
        payload: payload,
      })
    }) as ReducerToAction<typeof reducer>

    actions[actionType] = action
  }

  return actions
}
export type Initializer<S = any> = (
  ...args: any
) => {
  store: Store<S>
  actions: Actions
}

export type InitializerState<I extends Initializer> = I extends (
  ...args: any
) => {
  store: Store<infer S>
  actions: Actions
}
  ? S
  : never

export type InitializerActions<I extends Initializer> = I extends (
  ...args: any
) => {
  store: Store
  actions: infer A
}
  ? A
  : never

type Callback = () => any

type CallbackList = Callback[]

const publish = (callbackList: CallbackList) => {
  let resultList = []

  for (let i = 0; i < callbackList.length; i++) {
    let callback = callbackList[i]
    resultList.push(callback())
  }

  return resultList
}

let uid = 0

const createCallbackManager = () => {
  let id = uid++
  let isPreloaded = false
  let isStarted = false
  let isFinished = false

  let startCallbackList: CallbackList = []

  let addStartCallback = (startCallback: Callback) => {
    if (isPreloaded) {
      throw new Error(`Can't add start callback after preloading`)
    }

    if (!startCallbackList.includes(startCallback)) {
      startCallbackList.push(startCallback)
    }
  }

  let start = () => {
    if (!isPreloaded) {
      throw new Error(`Expected calling .preload() before .start()`)
    }

    if (isStarted) {
      return
    }

    isStarted = true

    let list = startCallbackList
    startCallbackList = []
    publish(list)
  }

  let finishCallbackList: CallbackList = []

  let addFinishCallback = (finishCallback: Callback) => {
    if (isPreloaded) {
      throw new Error(`Can't add finish callback after preloading`)
    }

    if (!finishCallbackList.includes(finishCallback)) {
      finishCallbackList.push(finishCallback)
    }
  }

  let finish = () => {
    if (!isStarted) {
      throw new Error(`Expected calling .start() before .finish()`)
    }

    if (isFinished) {
      return
    }

    isFinished = true

    let list = finishCallbackList
    finishCallbackList = []
    publish(list)
  }

  let preloadCallbackList: CallbackList = []

  let addPreloadCallback = (preloadCallback: Callback) => {
    if (isPreloaded) {
      throw new Error(`Can't add preload callback after preloading`)
    }

    if (!preloadCallbackList.includes(preloadCallback)) {
      preloadCallbackList.push(preloadCallback)
    }
  }

  let preload = async <T>(): Promise<T[]> => {
    if (isPreloaded || !preloadCallbackList.length) {
      isPreloaded = true
      return []
    }

    let list = preloadCallbackList
    preloadCallbackList = []

    let resultList = await Promise.all(publish(list))

    isPreloaded = true

    return (resultList as unknown) as T[]
  }

  let clearPreloadCallbackList = () => {
    isPreloaded = true
    preloadCallbackList = []
  }

  return {
    preload,
    addPreloadCallback,
    isPreloaded() {
      return isPreloaded
    },
    start,
    addStartCallback,
    isStarted() {
      return isStarted
    },
    finish,
    addFinishCallback,
    isFinished() {
      return isFinished
    },
    clearPreloadCallbackList,
  }
}

export type CreatePureModelOptions<I extends Initializer> = {
  preloadedState?: PreloadedState<InitializerState<I>>
  context?: ModelContextValue
}

export const createPureModel = <I extends Initializer>(initializer: I, options: CreatePureModelOptions<I> = {}) => {
  let {
    preload,
    addPreloadCallback,
    isPreloaded,
    start,
    addStartCallback,
    isStarted,
    finish,
    addFinishCallback,
    isFinished,
    clearPreloadCallbackList,
  } = createCallbackManager()

  let setupContext = ((ctx: ModelContext) => {
    if (options.context) {
      let target = getModelContextValue(options.context, ctx.id)

      if (target) {
        return target.value
      }
    }

    return ctx.initialValue
  }) as AnyFn

  let hasStore = false

  let setupStore = <S, RS extends Reducers<S>>(storeOptions: CreateStoreOptions<S, RS>) => {
    if (hasStore) {
      throw new Error(`Expected calling setupStore only once in initializer: ${initializer.toString()}`)
    }

    hasStore = true

    return createInternalStore({
      devtools: true,
      ...storeOptions,
      preloadedState: options.preloadedState,
    })
  }

  let implementations = {
    setupStore: setupStore,
    setupContext: setupContext,
    setupPreloadCallback: addPreloadCallback,
    setupStartCallback: addStartCallback,
    setupFinishCallback: addFinishCallback,
  }

  let result = run(() => {
    let result = initializer()

    if (!result) {
      throw new Error(`Expected initializer returning { store, actions }, but got ${result}`)
    }

    let { store, actions } = result

    if (!store) {
      throw new Error(`Expected initializer returning { store, actions }, but got a invalid store: ${store}`)
    }

    if (!actions) {
      throw new Error(`Expected initializer returning { store, actions }, but got a invalid actions: ${actions}`)
    }

    return { store, actions } as ReturnType<I>
  }, implementations)

  // ignore preload callbacks if preloadedState was received
  if (options.preloadedState !== undefined) {
    clearPreloadCallbackList()
  }

  return {
    ...result,
    preload,
    start,
    finish,
    addPreloadCallback,
    addStartCallback,
    addFinishCallback,
    isPreloaded,
    isStarted,
    isFinished,
  }
}

export type Model<S = any> = {
  store: Store<S>
  actions: Actions
} & Omit<ReturnType<typeof createCallbackManager>, 'clearPreloadCallbackList'>

export function subscribe<S>(model: Model<S>, listener: (state: S) => void) {
  let unsubscribe = model.store.subscribe(() => {
    if (!model.isStarted()) {
      return
    }

    let state = model.store.getState()
    listener(state)
  })

  return unsubscribe
}

export function select<S, TSelected = unknown>(options: {
  model: Model<S>
  selector: (state: S) => TSelected
  listener: (state: TSelected) => void
  compare?: (curr: TSelected, prev: TSelected) => boolean
}) {
  if (!isPlainObject(options)) {
    throw new Error(
      `Expected subscribe(options) received { store, listener, selector?, compare? }, instead of ${options}`,
    )
  }

  let { model, selector, listener, compare = shallowEqual } = options

  let prevState = selector(model.store.getState())

  let unsubscribe = model.store.subscribe(() => {
    if (!model.isStarted()) {
      return
    }

    let state = model.store.getState()
    let currState = selector(state)

    if (!compare(currState, prevState)) {
      prevState = currState
      listener(currState)
    } else {
      prevState = currState
    }
  })

  return unsubscribe
}

type Stores = {
  [key: string]: Store
}

type StoreStateType<T extends Store> = T extends Store<infer S> ? S : never

type CombinedState<T extends Stores> = {
  [key in keyof T]: StoreStateType<T[key]>
}

type CombinedStore<T extends Stores> = Store<CombinedState<T>>

export function combineStore<T extends Stores>(stores: T): CombinedStore<T> {
  type State = CombinedState<T>
  let initialState = {} as State

  for (let key in stores) {
    initialState[key] = stores[key].getState()
  }

  let { store, actions } = setupStore({
    devtools: false,
    initialState,
    reducers: {
      update: (state: State, [key, value]: [keyof T, T[keyof T]]) => {
        return {
          ...state,
          [key]: value,
        }
      },
    },
  })

  for (let key in stores) {
    stores[key].subscribe(() => {
      actions.update([key, stores[key].getState()])
    })
  }

  return store
}
