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
  mergeModelContext,
  setupModel,
  createPureModelContainer,
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
    let finishes: number[] = []
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
        finishes.push(i++)
      })

      setupFinishCallback(() => {
        finishes.push(i++)
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
    expect(finishes).toEqual([4, 5])
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
      let data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

      for (let i = 0; i < list.length; i++) {
        expect(list[i]).toEqual(data[i])
      }

      expect(list.length > 0).toBe(true)

      done()
    }, 40)

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

  it('support setupModel to access another models', async () => {
    let TestContext = createModelContext(0)

    function counter0() {
      let { store, actions } = setupCounter()

      let testContext = setupContext(TestContext)

      setupPreloadCallback(() => {
        actions.increBy(10 + testContext)
      })

      return {
        store,
        actions,
      }
    }

    function counter1() {
      let { store, actions } = setupCounter()

      let testContext = setupContext(TestContext)

      setupPreloadCallback(() => {
        actions.increBy(20 + testContext)
      })

      return {
        store,
        actions,
      }
    }

    type Counter2State = {
      count1: number
      count2: number
      testContextValue: number
    }

    function counter2() {
      let { store, actions } = setupStore({
        initialState: {
          count1: 0,
          count2: 0,
        } as Counter2State,
        reducers: {
          update: (state: Counter2State, newState: Counter2State): Counter2State => {
            return {
              ...state,
              ...newState,
            }
          },
        },
      })

      let testContext = setupContext(TestContext)

      let counter0Model = setupModel(counter0)

      let counter1Model = setupModel(counter1)

      setupPreloadCallback(() => {
        actions.update({
          count1: counter0Model.store.getState(),
          count2: counter1Model.store.getState(),
          testContextValue: testContext,
        })
      })

      return {
        store,
        actions,
      }
    }

    let container = createPureModelContainer()
    let testContext = TestContext.create(3)

    container.set(counter0, {
      context: testContext,
    })

    container.set(counter1, {
      context: testContext,
    })

    let counter0Model = createPureModel(counter0, {
      container: container,
    })

    let counter1Model = createPureModel(counter1, {
      container: container,
    })

    let counter2Model = createPureModel(counter2, {
      container: container,
      context: TestContext.create(4),
    })

    await counter2Model.preload()

    expect(counter0Model.isPreloaded()).toEqual(true)
    expect(counter0Model.store.getState()).toEqual(13)

    expect(counter1Model.isPreloaded()).toEqual(true)
    expect(counter1Model.store.getState()).toEqual(23)

    expect(counter2Model.store.getState()).toEqual({
      count1: 13,
      count2: 23,
      testContextValue: 4,
    })

    // test preloadedState

    container = createPureModelContainer()
    testContext = TestContext.create(3)

    container.set(counter0, {
      preloadedState: 100,
      context: testContext,
    })

    container.set(counter1, {
      preloadedState: 200,
      context: testContext,
    })

    counter0Model = createPureModel(counter0, {
      container: container,
    })

    counter1Model = createPureModel(counter1, {
      container: container,
    })

    counter2Model = createPureModel(counter2, {
      container: container,
      context: TestContext.create(4),
    })

    await counter2Model.preload()

    expect(counter0Model.isPreloaded()).toEqual(true)
    expect(counter0Model.store.getState()).toEqual(100)

    expect(counter1Model.isPreloaded()).toEqual(true)
    expect(counter1Model.store.getState()).toEqual(200)

    expect(counter2Model.store.getState()).toEqual({
      count1: 100,
      count2: 200,
      testContextValue: 4,
    })
  })
})
