import 'jest'
import {
  createPureModel,
  createModelContext,
  setupStore,
  setupContext,
  setupStartCallback,
  setupFinishCallback,
  setupPreloadCallback,
  subscribe,
  select,
  combineStore,
  mergeModelContext,
} from '../core'

const setupInterval = (f: () => void) => {
  let timerId: any

  let enable = (period = 10) => {
    disable()
    timerId = setInterval(f, period)
  }

  let disable = () => {
    clearInterval(timerId)
  }

  return {
    enable,
    disable,
  }
}

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

describe('pure-model', () => {
  it('should return well-typed result', async () => {
    let counter = createPureModel(setupCounter)

    expect(counter.store.getState()).toEqual(0)

    counter.actions.incre()

    expect(counter.store.getState()).toEqual(1)

    counter.actions.increBy(2)

    expect(counter.store.getState()).toEqual(3)

    counter.actions.decre()

    expect(counter.store.getState()).toEqual(2)
  })

  it('should reconcile life-cycle hooks in the correct order', async () => {
    let starts: number[] = []
    let preloads: number[] = []
    let finishs: number[] = []
    let counter = createPureModel(() => {
      let counter = setupCounter()
      let i = 0

      setupStartCallback(() => {
        starts.push(i++)
      })

      setupPreloadCallback(() => {
        preloads.push(i++)
      })

      setupPreloadCallback(() => {
        preloads.push(i++)
      })

      setupStartCallback(() => {
        starts.push(i++)
      })

      setupFinishCallback(() => {
        finishs.push(i++)
      })

      setupFinishCallback(() => {
        finishs.push(i++)
      })

      return counter
    })

    expect(() => {
      counter.start()
    }).toThrow('Expected calling .preload() before .start()')

    expect(() => {
      counter.finish()
    }).toThrow('Expected calling .start() before .finish()')

    await counter.preload()

    expect(() => {
      counter.finish()
    }).toThrow('Expected calling .start() before .finish()')

    counter.start()
    counter.finish()

    expect(preloads).toEqual([0, 1])
    expect(starts).toEqual([2, 3])
    expect(finishs).toEqual([4, 5])
  })

  it('should not consume state before .start()', async () => {
    let counter = createPureModel(setupCounter)
    let list: number[] = []

    subscribe(counter, (state) => {
      list.push(state)
    })

    counter.actions.incre()
    counter.actions.incre()

    await counter.preload()

    counter.actions.incre()
    counter.actions.incre()

    counter.start()

    counter.actions.incre()
    counter.actions.incre()

    expect(list).toEqual([5, 6])
  })

  it('should not consume after unsubscribing', async () => {
    let counter = createPureModel(setupCounter)
    let list: number[] = []

    let unsubscribe = subscribe(counter, (state) => {
      list.push(state)
    })

    await counter.preload()
    counter.start()

    expect(typeof unsubscribe).toEqual('function')

    counter.actions.incre()
    counter.actions.incre()

    counter.actions.decre()
    counter.actions.incre()

    unsubscribe()

    counter.actions.incre()
    counter.actions.incre()

    expect(list).toEqual([1, 2, 1, 2])
  })

  it('should throw error when calling setupStore more than once', async () => {
    expect(() => {
      createPureModel(() => {
        setupCounter()
        return setupCounter()
      })
    }).toThrow()
  })

  // it('supports combining stores and returning nested actions', async () => {
  //   let multiCounters = createPureModel(() => {
  //     let a = setupCounter(10)
  //     let b = setupCounter(20)

  //     let store = combineStore({
  //       a: a.store,
  //       b: b.store
  //     })

  //     let actions = {
  //       a: a.actions,
  //       b: b.actions
  //     }

  //     return {
  //       store,
  //       actions
  //     }
  //   })

  //   expect(multiCounters.store.getState()).toEqual({
  //     a: 10,
  //     b: 20
  //   })

  //   let list: { a: number; b: number }[] = []

  //   subscribe(multiCounters, state => {
  //     list.push(state)
  //   })

  //   await multiCounters.preload()
  //   multiCounters.start()

  //   multiCounters.actions.a.incre()
  //   multiCounters.actions.b.decre()

  //   multiCounters.actions.a.decre()
  //   multiCounters.actions.b.incre()

  //   multiCounters.actions.a.increBy(1)
  //   multiCounters.actions.b.increBy(-1)

  //   expect(list).toEqual([
  //     {
  //       a: 11,
  //       b: 20
  //     },
  //     {
  //       a: 11,
  //       b: 19
  //     },
  //     {
  //       a: 10,
  //       b: 19
  //     },
  //     {
  //       a: 10,
  //       b: 20
  //     },
  //     {
  //       a: 11,
  //       b: 20
  //     },
  //     {
  //       a: 11,
  //       b: 19
  //     }
  //   ])
  // })

  it('supports calling actions in life-cycle hooks', async () => {
    let counter = createPureModel(() => {
      let { store, actions } = setupCounter(10)

      setupPreloadCallback(() => {
        actions.increBy(20)
      })

      setupStartCallback(() => {
        actions.increBy(30)
      })

      setupFinishCallback(() => {
        actions.increBy(40)
      })

      return {
        store,
        actions,
      }
    })

    expect(counter.store.getState()).toEqual(10)

    await counter.preload()

    expect(counter.store.getState()).toEqual(30)

    counter.start()

    expect(counter.store.getState()).toEqual(60)

    counter.finish()

    expect(counter.store.getState()).toEqual(100)
  })

  it('supports define action with effects', async (done) => {
    let counter = createPureModel(() => {
      let { store, actions } = setupCounter()

      let timer = setupInterval(() => {
        actions.incre()
      })

      return {
        store,
        actions: {
          ...actions,
          timer,
        },
      }
    })

    let list: number[] = []

    subscribe(counter, (state) => {
      list.push(state)
    })

    await counter.preload()
    counter.start()

    counter.actions.timer.enable(10)

    setTimeout(() => {
      counter.actions.timer.disable()
      expect(list).toEqual([1, 2])
      done()
    }, 29)

    expect(list.length).toEqual(0)
  })

  it('supports preloadedState that injecting state to store and ignore calling .preload()', async () => {
    let counter = createPureModel(
      () => {
        let { store, actions } = setupCounter()

        setupPreloadCallback(() => {
          throw new Error(`Should not run here`)
        })

        return {
          store,
          actions,
        }
      },
      {
        preloadedState: 100,
      },
    )

    expect(counter.isPreloaded()).toEqual(true)

    expect(counter.store.getState()).toEqual(100)

    await counter.preload()

    expect(counter.store.getState()).toEqual(100)
  })

  it('supports inject context via createModelContext and setupContext', async () => {
    let context = createModelContext(100)

    let counter = createPureModel(() => {
      let initialCount = setupContext(context)
      return setupCounter(initialCount)
    })

    expect(counter.store.getState()).toEqual(100)
  })

  it('supports pass context to createPureModel', async () => {
    let context = createModelContext(100)

    let counter = createPureModel(
      () => {
        let initialCount = setupContext(context)
        return setupCounter(initialCount)
      },
      {
        context: context.create(200),
      },
    )

    expect(counter.store.getState()).toEqual(200)
  })

  it('supports pass multi contexts to createPureModel', async () => {
    let context0 = createModelContext(0)
    let context1 = createModelContext(0)

    let counter = createPureModel(
      () => {
        let initialCount0 = setupContext(context0)
        let initialCount1 = setupContext(context1)

        return setupCounter(initialCount0 - initialCount1)
      },
      {
        context: mergeModelContext(context1.create(99), context0.create(100)),
      },
    )

    expect(counter.store.getState()).toEqual(1)
  })
})
