import { createPureModel, setupStore, select } from '@pure-model/core'

import { Draft, toReducer, toReducers } from '../index'

let setupCounter = (n = 0) => {
  let { store, actions } = setupStore({
    initialState: n,
    reducers: {
      incre: (state: number) => state + 1,
      decre: (state: number) => state - 1,
      increBy: (state: number, step: number = 1) => state + step,
    },
  })
  return {
    store,
    actions,
  }
}

describe('immer', () => {
  it('should support immer reducer to normal reducer', () => {
    type State = { count: number }

    let immerReducer0 = (state: Draft<State>) => {
      state.count += 1
    }

    let immerReducer1 = (state: Draft<State>, step: number) => {
      state.count += step
    }

    let reducer0 = toReducer(immerReducer0)
    let reducer1 = toReducer(immerReducer1)

    let reducers = toReducers({
      incre: immerReducer0,
      increBy: immerReducer1,
    })

    let state0: State = {
      count: 0,
    }

    let state1 = reducer0(state0)
    let state2 = reducer1(state1, 2)
    let state3 = reducers.incre(state2)
    let state4 = reducers.increBy(state3, -2)

    expect(state0).toEqual({
      count: 0,
    })

    expect(state1).toEqual({
      count: 1,
    })

    expect(state2).toEqual({
      count: 3,
    })

    expect(state3).toEqual({
      count: 4,
    })

    expect(state4).toEqual({
      count: 2,
    })
  })

  it('should support using for setupStore', async () => {
    type State = {
      count: number
    }

    let initialState: State = {
      count: 10,
    }

    let model = createPureModel(() => {
      let reducers = toReducers({
        incre: (state: Draft<State>) => {
          state.count++
        },
        increBy: (state: Draft<State>, step: number = 1) => {
          state.count += step
        },
      })

      let store = setupStore({
        initialState,
        reducers,
      })

      return store
    })

    await model.preload()

    model.start()

    expect(model.store.getState()).toEqual({
      count: 10,
    })

    model.actions.incre()

    expect(model.store.getState()).toEqual({
      count: 11,
    })

    model.actions.increBy(-10)

    expect(model.store.getState()).toEqual({
      count: 1,
    })

    model.actions.increBy()

    expect(model.store.getState()).toEqual({
      count: 2,
    })
  })

  it('should forbidden non-plain-data in redux store in non-production env', async () => {
    expect(() => {
      createPureModel(() => {
        return setupStore({
          initialState: {
            a() {
              return 1
            },
            b: new MouseEvent('click'),
          },
          reducers: {},
        })
      })
    }).toThrow(/^Expected plain (data|object)/i)

    let model = createPureModel(() => {
      return setupStore({
        initialState: {},
        reducers: {
          update: () => {
            return {
              a() {
                return 1
              },
              b: new MouseEvent('click'),
            }
          },
        },
      })
    })

    expect(() => {
      model.actions.update()
    }).toThrow(/^Expected plain (data|object)/i)
  })

  it('should forbidden non-plain-data pass to action in non-production env', async () => {
    let model = createPureModel(setupCounter)

    expect((process as any).env.NODE_ENV !== 'production').toBe(true)

    expect(() => {
      model.actions.increBy(new Error('test') as any)
    }).toThrow(/^Expected plain (data|object)/i)

    expect(() => {
      model.actions.increBy((() => 0) as any)
    }).toThrow(/^Expected plain (data|object)/i)

    expect(() => {
      model.actions.increBy(new MouseEvent('click') as any)
    }).toThrow(/^Expected plain (data|object)/i)

    expect(() => {
      model.actions.increBy(new Set() as any)
    }).toThrow(/^Expected plain (data|object)/i)

    expect(() => {
      model.actions.increBy(new Map() as any)
    }).toThrow(/^Expected plain (data|object)/i)

    expect(() => {
      class Test {}
      model.actions.increBy(new Test() as any)
    }).toThrow(/^Expected plain (data|object)/i)
  })

  it('support subscribe model via select function', async () => {
    type State = {
      a: number
      b: number
    }
    let model = createPureModel(() => {
      let initialState: State = {
        a: 0,
        b: 1,
      }

      let increA = (state: State) => {
        return {
          ...state,
          a: state.a + 1,
        }
      }
      let increB = (state: State) => {
        return {
          ...state,
          b: state.b + 1,
        }
      }

      let swap = (state: State) => {
        return {
          ...state,
          a: state.b,
          b: state.a,
        }
      }

      let { store, actions } = setupStore({
        initialState,
        reducers: {
          increA,
          increB,
          swap,
        },
      })

      return { store, actions }
    })

    let list: number[] = []

    select({
      model,
      selector: (state: State) => state.a + state.b,
      listener: (value) => {
        list.push(value)
      },
    })

    await model.preload()

    model.start()

    model.actions.increA()
    model.actions.swap()
    model.actions.increB()

    expect(list).toEqual([2, 3])
  })
})
