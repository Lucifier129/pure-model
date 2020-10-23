import produce, { Draft, enableES5 } from 'immer'

if (typeof Proxy !== 'function') enableES5()

type Tail<T extends any[]> = ((...t: T) => any) extends (_: any, ...tail: infer TT) => any ? TT : []

export type { Draft }

export type ImmerReducerWithoutPayload<S = any, Return = void> = (state: Draft<S>) => Return

export type ImmerReducerWithPayload<S = any, P = any, Return = void> = (state: Draft<S>, payload: P) => Return

export type ImmerReducerWithOptionalPayload<S = any, P = any, Return = void> = (state: Draft<S>, payload?: P) => Return

export type ImmerReducer<S = any> =
  | ImmerReducerWithoutPayload<S>
  | ImmerReducerWithPayload<S>
  | ImmerReducerWithOptionalPayload<S>

export type ImmerReducerStateType<R extends ImmerReducer> = R extends ImmerReducer<Draft<infer S>> ? S : never

export type ImmerReducerArgs<R extends ImmerReducer> = R extends (...args: infer Args) => any ? Args : never

export type ImmerReducers<S = any> = {
  [key: string]: ImmerReducer<S>
}

export type ImmerReducerToReducer<IR extends ImmerReducer> = (
  state: ImmerReducerStateType<IR>,
  ...args: Tail<ImmerReducerArgs<IR>>
) => ImmerReducerStateType<IR>

export type ImmerReducersToReducers<IRS extends ImmerReducers> = {
  [key in keyof IRS]: ImmerReducerToReducer<IRS[key]>
}

export const toReducer = <IR extends ImmerReducer>(immerReducer: IR) => {
  let reducer = (((state: any, action: any) => {
    return produce(state, (draft: any) => immerReducer(draft, action))
  }) as unknown) as ImmerReducerToReducer<IR>

  return reducer
}

export const toReducers = <IRS extends ImmerReducers>(immerReducers: IRS) => {
  let reducers = {} as ImmerReducersToReducers<IRS>

  for (let key in immerReducers) {
    reducers[key] = toReducer(immerReducers[key])
  }

  return reducers
}
