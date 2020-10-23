import { createPureModel, setupStore, ModelContextValue } from '@pure-model/core'

export const testHook = <F extends (...args: any) => any>(f: F, context?: ModelContextValue): ReturnType<F> => {
  let model = createPureModel(
    () => {
      let { store } = setupStore({
        initialState: 0,
        reducers: {},
      })

      return {
        store,
        actions: {
          result: f(),
        },
      }
    },
    {
      context,
    },
  )

  return model.actions.result as ReturnType<F>
}
