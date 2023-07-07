import 'jest'
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { act } from 'react-dom/test-utils'
import {
  createModelContext,
  setupStore,
  setupContext,
  setupStartCallback,
  setupFinishCallback,
  setupPreloadCallback,
  MODEL_CONTEXT,
  setupModel,
  createPureModelContainer,
} from '@pure-model/core'
import { createReactModel, Provider, preload, useReactModel, provide, ReactModelArgs } from '../'

const createDeferred = () => {
  let resolve
  let reject
  let promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { resolve, reject, promise }
}

let setupCounter = (n = 0) => {
  let { store, actions } = setupStore({
    initialState: n,
    reducers: {
      incre: (state: number) => state + 1,
      decre: (state: number) => state - 1,
      increBy: (state: number, step: number) => state + step,
    },
  })
  return {
    store,
    actions,
  }
}

let delay = (duration: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration)
  })

describe('react bindings of pure-model', () => {
  let container: any
  let deferred: any
  let next = (value?: any) => {
    deferred.resolve(value)
  }

  beforeEach(() => {
    deferred = createDeferred()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    container = null
    deferred = null
  })

  it('basic usage work correctly', async () => {
    let Context = createModelContext(10)
    let Model = createReactModel(() => {
      let initialCount = setupContext(Context)

      expect(initialCount).toBe(20)

      let { store, actions } = setupCounter(initialCount)

      return { store, actions }
    })
    let App = () => {
      let state = Model.useState()
      let actions = Model.useActions()

      let handleIncre = () => {
        actions.incre()
      }

      let handleDescre = () => {
        actions.decre()
      }

      useEffect(() => {
        next()
      })

      return (
        <>
          <button id="incre" onClick={handleIncre}>
            +1
          </button>
          <span id="count">{state}</span>
          <button id="decre" onClick={handleDescre}>
            -1
          </button>
        </>
      )
    }

    act(() => {
      ReactDOM.render(
        <Model.Provider context={Context.create(20)} preloadedState={0}>
          <App />
        </Model.Provider>,
        container,
      )
    })

    await deferred.promise
    deferred = createDeferred()

    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $incre = document.querySelector('#incre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $decre = document.querySelector('#decre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $count = document.querySelector('#count') as Element

    expect($count.textContent).toBe('0')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('1')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('2')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('1')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('0')
  })

  it('supports preload state', async () => {
    let Model = createReactModel(() => {
      let { store, actions } = setupCounter()

      setupPreloadCallback(async () => {
        await delay(10)
        actions.increBy(20)
      })

      return {
        store,
        actions,
      }
    })

    let { Provider, state, model } = await Model.preload()

    expect(state).toBe(20)

    expect(model.store.getState()).toBe(20)

    let App = () => {
      let state = Model.useState()
      let actions = Model.useActions()

      let handleIncre = () => {
        actions.incre()
      }

      let handleDescre = () => {
        actions.decre()
      }

      useEffect(() => {
        next()
      })

      return (
        <>
          <button id="incre" onClick={handleIncre}>
            +1
          </button>
          <span id="count">{state}</span>
          <button id="decre" onClick={handleDescre}>
            -1
          </button>
        </>
      )
    }

    act(() => {
      ReactDOM.render(
        <Provider>
          <App />
        </Provider>,
        container,
      )
    })

    await deferred.promise
    deferred = createDeferred()

    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $incre = document.querySelector('#incre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $decre = document.querySelector('#decre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $count = document.querySelector('#count') as Element

    expect($count.textContent).toBe('20')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('21')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('22')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('21')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('20')
  })

  it('can pass multiple ReactModel to Provider component', async () => {
    let Model0 = createReactModel(() => setupCounter())
    let Model1 = createReactModel(() => setupCounter())

    let App = () => {
      let state0 = Model0.useState()
      let state1 = Model1.useState()
      let actions0 = Model0.useActions()
      let actions1 = Model1.useActions()

      let handleIncre = () => {
        actions0.incre()
        actions1.incre()
      }

      let handleDescre = () => {
        actions0.decre()
        actions1.decre()
      }

      useEffect(() => {
        next()
      })

      return (
        <>
          <button id="incre" onClick={handleIncre}>
            +1
          </button>
          <span id="count">{state0 + state1}</span>
          <button id="decre" onClick={handleDescre}>
            -1
          </button>
        </>
      )
    }

    act(() => {
      ReactDOM.render(
        <Provider
          list={[
            { Model: Model0, preloadedState: 10 },
            { Model: Model1, preloadedState: -10 },
          ]}
        >
          <App />
        </Provider>,
        container,
      )
    })

    await deferred.promise
    deferred = createDeferred()

    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $incre = document.querySelector('#incre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $decre = document.querySelector('#decre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $count = document.querySelector('#count') as Element

    expect($count.textContent).toBe('0')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('-2')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('0')
  })

  it('support use ReactModel locally', async () => {
    let list: string[] = []
    let Model = createReactModel(() => {
      let { store, actions } = setupCounter()

      setupPreloadCallback(() => {
        list.push('preload')
      })

      setupStartCallback(() => {
        list.push('start')
      })

      setupPreloadCallback(() => {
        list.push('preload')
      })

      setupFinishCallback(() => {
        list.push('finish')
      })

      setupStartCallback(() => {
        list.push('start')
      })

      setupFinishCallback(() => {
        list.push('finish')
      })

      setupFinishCallback(() => {
        next()
      })

      return {
        store,
        actions,
      }
    })
    let App = () => {
      let [state, actions] = useReactModel(Model, {
        preloadedState: 10,
      })

      let handleIncre = () => {
        actions.incre()
      }

      let handleDescre = () => {
        actions.decre()
      }

      useEffect(() => {
        next()
      })

      return (
        <>
          <button id="incre" onClick={handleIncre}>
            +1
          </button>
          <span id="count">{state}</span>
          <button id="decre" onClick={handleDescre}>
            -1
          </button>
        </>
      )
    }

    act(() => {
      ReactDOM.render(<App />, container)
    })

    await deferred.promise
    deferred = createDeferred()

    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $incre = document.querySelector('#incre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $decre = document.querySelector('#decre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $count = document.querySelector('#count') as Element

    expect($count.textContent).toBe('10')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('9')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('10')

    act(() => {
      ReactDOM.unmountComponentAtNode(container)
    })

    await deferred.promise

    expect(list).toEqual(['start', 'start', 'finish', 'finish'])
  })

  it('can preload multiple ReactModel', async () => {
    let Model0 = createReactModel(() => setupCounter())
    let Model1 = createReactModel(() => setupCounter())

    let App = () => {
      let state0 = Model0.useState()
      let state1 = Model1.useState()
      let actions0 = Model0.useActions()
      let actions1 = Model1.useActions()

      let handleIncre = () => {
        actions0.incre()
        actions1.incre()
      }

      let handleDescre = () => {
        actions0.decre()
        actions1.decre()
      }

      useEffect(() => {
        next()
      })

      return (
        <>
          <button id="incre" onClick={handleIncre}>
            +1
          </button>
          <span id="count">{state0 + state1}</span>
          <button id="decre" onClick={handleDescre}>
            -1
          </button>
        </>
      )
    }

    let { Provider, stateList, modelList } = await preload([
      { Model: Model0, preloadedState: 10 },
      { Model: Model1, preloadedState: -10 },
    ])

    expect(stateList).toEqual([10, -10])

    expect(modelList[0].store.getState()).toBe(10)
    expect(modelList[1].store.getState()).toBe(-10)

    act(() => {
      ReactDOM.render(
        <Provider>
          <App />
        </Provider>,
        container,
      )
    })

    await deferred.promise
    deferred = createDeferred()

    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $incre = document.querySelector('#incre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $decre = document.querySelector('#decre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $count = document.querySelector('#count') as Element

    expect($count.textContent).toBe('0')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('-2')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('0')
  })

  it('supports HOC style usage', async () => {
    let ModelContext0 = createModelContext(0)
    let ModelContext1 = createModelContext(1)
    let Model = createReactModel(() => {
      let count0 = setupContext(ModelContext0)
      let count1 = setupContext(ModelContext1)
      let { store, actions } = setupCounter(count0 + count1)
      return { store, actions }
    })

    let Counter = () => {
      let state = Model.useState()
      let actions = Model.useActions()
      let handleIncre = () => {
        actions.incre()
      }

      let handleDescre = () => {
        actions.decre()
      }

      useEffect(() => {
        next()
      })

      return (
        <>
          <button id="incre" onClick={handleIncre}>
            +1
          </button>
          <span id="count">{state}</span>
          <button id="decre" onClick={handleDescre}>
            -1
          </button>
        </>
      )
    }

    @provide({ Model })
    // @ts-ignore
    class App extends React.Component {
      [MODEL_CONTEXT] = {
        ...ModelContext0.impl(10),
        ...ModelContext1.impl(20),
      }
      render() {
        return <Counter />
      }
    }

    act(() => {
      ReactDOM.render(<App />, container)
    })

    await deferred.promise
    deferred = createDeferred()

    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $incre = document.querySelector('#incre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $decre = document.querySelector('#decre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $count = document.querySelector('#count') as Element

    expect($count.textContent).toBe('30')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('29')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('28')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('29')
  })

  it('should trigger callbacks is right orders', async () => {
    let list: string[] = []
    let Model = createReactModel(() => {
      let { store, actions } = setupCounter()

      setupPreloadCallback(() => {
        list.push('preload')
      })

      setupStartCallback(() => {
        list.push('start')
      })

      setupPreloadCallback(() => {
        list.push('preload')
      })

      setupFinishCallback(() => {
        list.push('finish')
      })

      setupStartCallback(() => {
        list.push('start')
      })

      setupFinishCallback(() => {
        list.push('finish')
      })

      setupStartCallback(() => {
        next()
      })

      setupFinishCallback(() => {
        next()
      })

      return {
        store,
        actions,
      }
    })

    let App = () => {
      return null
    }

    act(() => {
      ReactDOM.render(
        <Model.Provider>
          <App />
        </Model.Provider>,
        container,
      )
    })

    await deferred.promise
    deferred = createDeferred()

    expect(list).toEqual(['preload', 'preload', 'start', 'start'])

    act(() => {
      ReactDOM.unmountComponentAtNode(container)
    })

    await deferred.promise
    deferred = createDeferred()

    expect(list).toEqual(['preload', 'preload', 'start', 'start', 'finish', 'finish'])
  })

  it('should support selector', async () => {
    let Context = createModelContext(10)
    let Model = createReactModel(() => {
      let initialCount = setupContext(Context)

      expect(initialCount).toBe(20)

      let { store, actions } = setupCounter(initialCount)

      return { store, actions }
    })
    let App = (props: { count: number }) => {
      let state = Model.useState((state) => state + props.count)
      let actions = Model.useActions()

      let handleIncre = () => {
        actions.incre()
      }

      let handleDescre = () => {
        actions.decre()
      }

      useEffect(() => {
        next()
      })

      return (
        <>
          <button id="incre" onClick={handleIncre}>
            +1
          </button>
          <span id="count">{state}</span>
          <button id="decre" onClick={handleDescre}>
            -1
          </button>
        </>
      )
    }

    act(() => {
      ReactDOM.render(
        <Model.Provider context={Context.create(20)} preloadedState={0}>
          <App count={0} />
        </Model.Provider>,
        container,
      )
    })

    await deferred.promise
    deferred = createDeferred()

    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $incre = document.querySelector('#incre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $decre = document.querySelector('#decre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $count = document.querySelector('#count') as Element

    expect($count.textContent).toBe('0')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('1')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('2')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('1')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('0')

    await act(async () => {
      ReactDOM.render(
        <Model.Provider context={Context.create(20)} preloadedState={0}>
          <App count={1} />
        </Model.Provider>,
        container,
      )
    })

    expect($count.textContent).toBe('1')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count.textContent).toBe('2')

    await act(async () => {
      ReactDOM.render(
        <Model.Provider context={Context.create(20)} preloadedState={0}>
          <App count={2} />
        </Model.Provider>,
        container,
      )
    })

    expect($count.textContent).toBe('3')
  })

  it('support setupModel to access another ReactModel', async () => {
    let Model0 = createReactModel(() => {
      let { store, actions } = setupCounter(3)

      setupPreloadCallback(() => {
        actions.increBy(10)
      })

      return { store, actions }
    })

    let Model1 = createReactModel(() => {
      let { store, actions } = setupCounter(4)

      let model1 = setupModel(Model0)

      setupPreloadCallback(() => {
        actions.increBy(model1.store.getState())
      })

      return { store, actions }
    })

    let App = () => {
      let model0state = Model0.useState()
      let model0actions = Model0.useActions()

      let model1state = Model1.useState()
      let model1actions = Model1.useActions()

      let handleIncre = () => {
        model0actions.incre()
        model1actions.incre()
      }

      let handleDescre = () => {
        model0actions.decre()
        model1actions.decre()
      }

      useEffect(() => {
        next()
      })

      return (
        <>
          <button id="incre" onClick={handleIncre}>
            +1
          </button>
          <span id="count1">{model0state}</span>
          <span id="count2">{model1state}</span>
          <button id="decre" onClick={handleDescre}>
            -1
          </button>
        </>
      )
    }

    let modelContainer = createPureModelContainer()

    let list: ReactModelArgs[] = [
      {
        Model: Model0,
      },
      {
        Model: Model1,
      },
    ]

    act(() => {
      ReactDOM.render(
        <Provider list={list} container={modelContainer}>
          <App />
        </Provider>,
        container,
      )
    })

    await deferred.promise
    deferred = createDeferred()

    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $incre = document.querySelector('#incre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $decre = document.querySelector('#decre') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $count1 = document.querySelector('#count1') as Element
    // tslint:disable-next-line: no-unnecessary-type-assertion
    let $count2 = document.querySelector('#count2') as Element

    expect($count1.textContent).toBe('13')
    expect($count2.textContent).toBe('17')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $incre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count1.textContent).toBe('14')
    expect($count2.textContent).toBe('18')

    // tslint:disable-next-line: await-promise
    await act(async () => {
      $decre.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await deferred.promise
      deferred = createDeferred()
    })

    expect($count1.textContent).toBe('13')
    expect($count2.textContent).toBe('17')
  })
})
