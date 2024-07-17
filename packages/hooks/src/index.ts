type AsyncFunction = (...args: any) => Promise<any>
type ArgsType<T extends (...args: any) => any> = T extends (...args: infer A) => any ? A : never

type PromiseValueType<T extends Promise<any>> = T extends Promise<infer V> ? V : never

type CancelCallbacks<T extends AsyncFunction> = {
  onData: (data: PromiseValueType<ReturnType<T>>) => any
  onError: (error: Error) => any
  onCancel: () => any
  onStart: () => any
  onFinish: () => any
}

// tslint:disable-next-line: no-empty
const noop = () => {}

const defaultCancelCallbacks: CancelCallbacks<AsyncFunction> = {
  onData: noop,
  onError: noop,
  onCancel: noop,
  onStart: noop,
  onFinish: noop,
}

export const setupCancel = <T extends AsyncFunction>(task: T, options: Partial<CancelCallbacks<T>> = {}) => {
  let consumers = Object.assign({}, defaultCancelCallbacks, options)

  let uid = 0

  let isStart = false

  let start = (...args: ArgsType<T>) => {
    if (isStart) {
      cancel()
    }

    let current = ++uid

    let handleStart = () => {
      isStart = true
      consumers.onStart()
    }

    let handleFinish = () => {
      if (isStart && current === uid) {
        isStart = false
        consumers.onFinish()
      }
    }

    let handleData = (data: PromiseValueType<ReturnType<T>>) => {
      if (isStart && current === uid) {
        consumers.onData(data)
      }
    }

    let handleError = (error: Error) => {
      if (isStart && current === uid) {
        consumers.onError(error)
      }
    }

    let result: any
    let hasError = false

    handleStart()

    try {
      result = task(...(args as any))
    } catch (error: unknown) {
      hasError = true
      handleError(error instanceof Error ? error : new Error('Unknown error'))
    }

    if (hasError) {
      handleFinish()
    } else {
      if (result instanceof Promise) {
        result.then(handleData, handleError)
        result.then(handleFinish, handleFinish)
      } else {
        throw new Error(`Expected task returning promise, instead of ${result}`)
      }
    }
  }

  let cancel = () => {
    if (isStart) {
      isStart = false
      consumers.onFinish()
      consumers.onCancel()
    }
  }

  return {
    start,
    cancel,
  }
}

type SequenceCallbacks<T extends AsyncFunction> = {
  onData: (data: PromiseValueType<ReturnType<T>>) => any
  onError: (error: Error) => any
}

const defaultSequenceCallbacks: SequenceCallbacks<AsyncFunction> = {
  onData: noop,
  onError: noop,
}

export const setupSequence = <T extends AsyncFunction>(task: T, options: Partial<SequenceCallbacks<T>> = {}) => {
  type Data = PromiseValueType<ReturnType<T>>
  type Item =
    | {
        kind: 'data'
        data: Data
      }
    | {
        kind: 'error'
        error: Error
      }
    | null

  let finalOptions = Object.assign({}, defaultSequenceCallbacks, options)

  let uid = 0
  let items: Item[] = []

  let consume = (index: number) => {
    let item = items[index]

    if (item) {
      items[index] = null

      if (item.kind === 'data') {
        finalOptions.onData(item.data)
      }

      if (item.kind === 'error') {
        finalOptions.onError(item.error)
      }
      return true
    } else {
      return false
    }
  }

  let trigger = (index: number) => {
    let count = index

    while (count) {
      let item = items[count]
      // tslint:disable-next-line: strict-type-predicates
      if (item === undefined) {
        return
      }
      count -= 1
    }

    // consume previous
    for (let i = 0; i <= index; i++) {
      consume(i)
    }

    // consume next
    let offset = 1

    while (consume(index + offset)) {
      offset += 1
    }
  }

  let start = (...args: ArgsType<T>): ReturnType<T> => {
    let index = uid++
    let handleData = (data: Data) => {
      items[index] = {
        kind: 'data',
        data,
      }
      trigger(index)
    }
    let handleError = (error: Error) => {
      items[index] = {
        kind: 'error',
        error,
      }
      trigger(index)
    }

    let result = task(...(args as any))

    if (result instanceof Promise) {
      result.then(handleData, handleError)
    } else {
      throw new Error(`Expected task returning promise, instead of ${result}`)
    }

    return result as ReturnType<T>
  }

  return start
}

type IntervalCallbacks = {
  onData: (data: number) => any
  onStart: () => any
  onStop: () => any
  onReset: () => any
}

const defaultIntervalCallbacks: IntervalCallbacks = {
  onData: noop,
  onStart: noop,
  onStop: noop,
  onReset: noop,
}

export const setupInterval = (options: Partial<IntervalCallbacks> = {}) => {
  let finalOptions = Object.assign({}, defaultIntervalCallbacks, options)

  let count = 0
  let isStart = false
  let tid: any

  let start = (period: number = 0) => {
    if (period === 0) {
      stop()
      return
    }

    if (isStart) {
      clearInterval(tid)
    } else {
      finalOptions.onStart()
    }

    isStart = true
    tid = setInterval(() => {
      finalOptions.onData(count++)
    }, period)
  }

  let stop = () => {
    if (!isStart) return
    isStart = false
    clearInterval(tid)
    finalOptions.onStop()
  }

  let reset = () => {
    count = 0
    finalOptions.onReset()
  }

  return {
    start,
    stop,
    reset,
  }
}
