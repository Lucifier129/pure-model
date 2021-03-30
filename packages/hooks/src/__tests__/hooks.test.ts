import 'jest'
import { createPureModel, setupStore } from '@pure-model/core'
import { setupCancel, setupSequence, setupInterval } from '../'

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

const createDeferred = () => {
  let resolve
  let reject
  let promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { resolve, reject, promise }
}

let delay = (duration: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration)
  })

describe('preset', () => {
  let deferred: any

  beforeEach(() => {
    deferred = createDeferred()
  })

  afterEach(() => {
    deferred = null
  })

  it('should support setupCancel', async () => {
    let info = {
      data: 0,
      error: 0,
      cancel: 0,
      start: 0,
      finish: 0,
    }

    let model = createPureModel(() => {
      let { store, actions } = setupCounter()

      let task = async (n: number) => {
        await deferred.promise
        if (n === 0) {
          throw new Error('n is zero')
        }
        return 1 + n
      }

      let { start, cancel } = setupCancel(task, {
        onData: (n) => {
          info.data += 1
          actions.increBy(n)
        },
        onError: (error) => {
          expect(error.message).toBe('n is zero')
          info.error += 1
        },
        onCancel: () => {
          info.cancel += 1
        },
        onStart: () => {
          info.start += 1
        },
        onFinish: () => {
          info.finish += 1
        },
      })

      return {
        store,
        actions: {
          ...actions,
          start,
          cancel,
        },
      }
    })

    expect(model.store.getState()).toEqual(0)

    expect(info).toEqual({
      data: 0,
      error: 0,
      cancel: 0,
      start: 0,
      finish: 0,
    })

    model.actions.start(1)

    expect(info).toEqual({
      data: 0,
      error: 0,
      cancel: 0,
      start: 1,
      finish: 0,
    })

    model.actions.cancel()

    deferred.resolve()

    await delay(1)

    // cancel() includes finish()
    expect(info).toEqual({
      data: 0,
      error: 0,
      cancel: 1,
      start: 1,
      finish: 1,
    })

    expect(model.store.getState()).toEqual(0)

    deferred = createDeferred()

    model.actions.start(1)

    expect(info).toEqual({
      data: 0,
      error: 0,
      cancel: 1,
      start: 2,
      finish: 1,
    })

    expect(model.store.getState()).toEqual(0)

    // call start before previous will cause calling cancel()
    model.actions.start(2)

    expect(info).toEqual({
      data: 0,
      error: 0,
      cancel: 2,
      start: 3,
      finish: 2,
    })

    deferred.resolve()

    await delay(1)

    expect(model.store.getState()).toEqual(3)

    // only trigger data from last call if calling start multiple time
    expect(info).toEqual({
      data: 1,
      error: 0,
      cancel: 2,
      start: 3,
      finish: 3,
    })

    deferred = createDeferred()

    model.actions.start(0)

    deferred.resolve()

    await delay(1)

    expect(info).toEqual({
      data: 1,
      error: 1,
      cancel: 2,
      start: 4,
      finish: 4,
    })
  })

  it('should support setupSequence', async () => {
    let list = [createDeferred(), createDeferred(), createDeferred()]

    let info = {
      data: 0,
      error: 0,
    }

    let model = createPureModel(() => {
      let { store, actions } = setupCounter()

      let sequenceIncreBy = setupSequence(
        async (index: number, step: number) => {
          if (index >= list.length) {
            throw new Error(`index is out of range`)
          }
          await list[index].promise
          return step
        },
        {
          onData: (step) => {
            info.data += 1
            actions.increBy(step)
          },
          onError: (error) => {
            info.error += 1
            expect(error.message).toEqual(`index is out of range`)
          },
        },
      )

      return {
        store,
        actions: {
          ...actions,
          sequenceIncreBy,
        },
      }
    })

    expect(model.store.getState()).toEqual(0)

    let result0 = model.actions.sequenceIncreBy(0, 1)
    let result1 = model.actions.sequenceIncreBy(1, 2)
    let result2 = model.actions.sequenceIncreBy(2, 3)

    expect(model.store.getState()).toEqual(0)
    expect(info).toEqual({
      data: 0,
      error: 0,
    })

    // @ts-ignore
    list[2].resolve()

    await delay(1)

    expect(model.store.getState()).toEqual(0)
    expect(info).toEqual({
      data: 0,
      error: 0,
    })

    // @ts-ignore
    list[0].resolve()

    await delay(1)

    expect(info).toEqual({
      data: 1,
      error: 0,
    })
    expect(model.store.getState()).toEqual(1)

    // @ts-ignore
    list[1].resolve()
    await delay(1)

    expect(model.store.getState()).toEqual(6)
    expect(info).toEqual({
      data: 3,
      error: 0,
    })

    // tslint:disable-next-line: no-floating-promises
    model.actions.sequenceIncreBy(3, 4)

    await delay(1)

    expect(model.store.getState()).toEqual(6)
    expect(info).toEqual({
      data: 3,
      error: 1,
    })

    expect(await result0).toEqual(1)
    expect(await result1).toEqual(2)
    expect(await result2).toEqual(3)
  })

  // it('should support setupInterval', async () => {
  //   let list: number[] = []
  //   let info = {
  //     data: 0,
  //     start: 0,
  //     stop: 0,
  //     reset: 0,
  //   }
  //   let model = createPureModel(() => {
  //     let { store, actions } = setupCounter()

  //     let { start, stop, reset } = setupInterval({
  //       onData: (n) => {
  //         info.data += 1
  //         list.push(n)
  //       },
  //       onStart: () => {
  //         info.start += 1
  //       },
  //       onStop: () => {
  //         info.stop += 1
  //       },
  //       onReset: () => {
  //         info.reset += 1
  //       },
  //     })

  //     return {
  //       store,
  //       actions: {
  //         ...actions,
  //         start,
  //         stop,
  //         reset,
  //       },
  //     }
  //   })

  //   expect(info).toEqual({
  //     data: 0,
  //     start: 0,
  //     stop: 0,
  //     reset: 0,
  //   })

  //   model.actions.start(10)

  //   expect(info).toEqual({
  //     data: 0,
  //     start: 1,
  //     stop: 0,
  //     reset: 0,
  //   })

  //   expect(list).toEqual([])

  //   await delay(112)

  //   model.actions.start(1)

  //   expect(info).toEqual({
  //     data: 10,
  //     start: 1,
  //     stop: 0,
  //     reset: 0,
  //   })

  //   expect(list).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

  //   model.actions.stop()

  //   expect(info).toEqual({
  //     data: 10,
  //     start: 1,
  //     stop: 1,
  //     reset: 0,
  //   })

  //   await delay(100)

  //   expect(list).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

  //   expect(info).toEqual({
  //     data: 10,
  //     start: 1,
  //     stop: 1,
  //     reset: 0,
  //   })

  //   model.actions.start(10)

  //   expect(info).toEqual({
  //     data: 10,
  //     start: 2,
  //     stop: 1,
  //     reset: 0,
  //   })

  //   expect(list).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

  //   model.actions.reset()

  //   expect(info).toEqual({
  //     data: 10,
  //     start: 2,
  //     stop: 1,
  //     reset: 1,
  //   })

  //   expect(list).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

  //   await delay(112)

  //   model.actions.stop()

  //   expect(info).toEqual({
  //     data: 20,
  //     start: 2,
  //     stop: 2,
  //     reset: 1,
  //   })

  //   expect(list).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  // })
})
