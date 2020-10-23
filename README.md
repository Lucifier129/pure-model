# pure-model

A framework for writing model-oriented programming

编写 UI 无关的通用业务逻辑，可适配 react-native 或者 react-dom 等多个平台、多个框架。

- 使用 redux 进行状态管理，支持 redux-devtools 和 redux-logger
- 支持通过 immer 简化 state 更新操作
- 支持 fetch/post/get 等接口交互
- 支持 SSR 服务端渲染
- 支持使用 Typescript 开发
- 提供 react-hooks api 优化使用方式
- 适配 react-imvc 和 react-native
- 可脱离 UI 独立运行和测试

## 安装

```shell
# install core
npm install --save @pure-model/core
# install react adapter
npm install --save @pure-model/react
# install immer adapter
npm install --save @pure-model/immer
# install pure-model hooks
npm install --save @pure-model/hooks
# install pure-model test utils
npm install --save @pure-model/test
# install next.js adapter
npm install --save @pure-model/next.js
```

快速安装 pure-model + react + next.js + immer

```shell
npm install --save @pure-model/core @pure-model/react @pure-model/next.js @pure-model/immer
```

## 目录

- [基本用法](#基本用法)演示了 pure-model + react 的朴素写法，可以让我们看到运行 pure-model 的几个基本步骤

- [API 介绍](#api-介绍)
  - [基础 API](#基础-api)
    - [createPureModel](#createpuremodelinitializer-options)
    - [setupStore](#setupstore-name-initialstate-reducers-devtools-logger-)
    - [createModelContext](#createmodelcontextinitialvalue-setupcontextmodelcontext-mergemodelcontextmodelcontxtvalue)
    - [setupPreloadCallback](#setuppreloadcallbacklistener)
    - [setupStartCallback](#setupstartcallbacklistener)
    - [setupFinishCallback](#setupfinishcallbacklistener)
    - [subscribe](#subscribemodel-listener)
    - [select](#selectoptions)
  - [React 组件适配 API](#react-组件适配-api)
    - [createReactModel](#createreactmodelinitializer)
    - [Provider](#provider-组件)
    - [preload](#preload-model-context-preloadedstate-)
    - [useReactModel](#usereactmodelreactmodel-options)
  - [Next.js 框架适配 API](#next.js-框架适配-api)
  - [immer 适配 API](#immer-适配)
  - [http 接口请求 API](#http-接口请求-api)
  - [测试辅助套件 API](#测试辅助套件-api)
  - [其它 API](#其它-api)
    - [setupCancel](#setupcancel)
    - [setupSequence](#setupsequence)
    - [setupInterval](#setupinterval)

### 基本用法

第一步，编写基于 redux 的状态管理代码

```typescript
// model/todo.ts

// 引入 setupStore
import { setupStore } from '@pure-model/core'
import { createReactModel } from '@pure-model/react'

// 定义 state 的类型
export type Todo = {
  id: number
  content: string
  completed: boolean
}

export type Todos = Todo[]

// 定义初始化 state
const initialState: Todos = []

// export react model
export default createReactModel(() => {
  let { store, actions } = setupStore({
    // 可选参数，会反映到 redux-devtools 里的 name
    name: 'todos',
    // 必选参数：initialState
    initialState,
    // 必须参数：reducers，更新状态函数
    reducers: {
      addTodo,
      removeTodo,
      updateTodoContent,
      updateTodoStatus,
      toggleTodo,
      toggleAll,
      clearCompleted,
    },
    // 可选参数，是否开启 redux-logger，默认为 false
    logger: true,
    // 可选参数，是否开启 redux-devtools，默认为 true
    devtools: true,
  })

  // 必须返回 store + actions 的对象结构
  return { store, actions }
})

/**
 * 编写 reducer 的方式进行了简化
 * 第一个参数为 state
 * 第二个参数为 payload，不需要添加 { type, payload } 的对象
 * payload 可以是任意纯数据类型(JSON)，但不能是函数，或者带原型的对象
 */
const addTodo = (todos: Todos, content: string) => {
  let todo = {
    id: Date.now(),
    content,
    completed: false,
  }
  return todos.concat(todo)
}

const removeTodo = (todos: Todos, id: number) => {
  return todos.filter((todo) => todo.id !== id)
}

const updateTodoContent = (todos: Todos, { id, content }: { id: number; content: string }) => {
  return todos.map((todo) => {
    if (todo.id !== id) return todo
    return {
      ...todo,
      content: content,
    }
  })
}

const updateTodoStatus = (todos: Todos, { id, completed }: { id: number; completed: boolean }) => {
  return todos.map((todo) => {
    if (todo.id !== id) return todo
    return {
      ...todo,
      completed,
    }
  })
}

const toggleTodo = (todos: Todos, id: number) => {
  return todos.map((todo) => {
    if (todo.id !== id) return todo
    return {
      ...todo,
      completed: !todo.completed,
    }
  })
}

const toggleAll = (todos: Todos) => {
  let isAllCompleted = todos.every((todo) => todo.completed)

  return todos.map((todo) => {
    return {
      ...todo,
      completed: !isAllCompleted,
    }
  })
}

const clearCompleted = (todos: Todos) => {
  return todos.filter((todo) => !todo.completed)
}
```

第二步，在 react 组件中，引入和使用 react model

```tsx
// index.tsx
import React from 'react'
import ReactDOM from 'react-dom'

import { Provider } from '@pure-model/react'

// 引入第一步编写的 react model 模块
import TodoModel from './model/todo'

const App = () => {
  let [text, setText] = React.useState('')

  // 通过 TodoModel.useState 获取到 TodoModel 内部的 redux store 的 state 状态
  let state = TodoModel.useState()

  // 通过 TodoModel.useActions 获取到 TodoModel 内部暴露出来的 actions 对象
  let actions = TodoModel.useActions()

  /**
   * 在 event-handler 里，调用 actions 函数，触发状态更新
   * 视图将自动更新
   * 注意：请勿直接将 event 对象传给 actions，这样会破坏 action 跨平台的能力
   * 将数据提纯为普通的 JSON 数据对象，再传入 action 函数
   */
  let handleAddTodo = (event) => {
    setText('')
    actions.addTodo(text)
  }

  let handleChange = (event) => {
    setText(event.target.value)
  }

  return (
    <div>
      <input type="text" value={text} onChange={handleChange} />
    </div>
  )
}

/**
 * 构造初始化 ReactModel 相关的参数
 * 支持初始化多个 ReactModel
 */
const ReactModelArgs = [
  {
    Model: Model, // 必选参数，要注入的 React Model 对象
    preloadedState: [], // 可选参数，要注入到 redux store 的预加载状态，
    context: undefined, // 可选参数，要注入到 model 内部的 context 对象
  },
]

/**
 * 初始化渲染
 */
ReactDOM.render(
  <Provider list={ReactModelArgs}>
    <App />
  </Provider>,
  document.getElementById('root'),
)
```

### 通过 react-class-component 启动

除了通过 `Provider` 组件启动以外，在 React 中，还有另一种方式，通过 `provide`

```tsx
import Controller from 'react-imvc/controller'
// 引入 MODEL_CONTEXT 这个 symbol
import { MODEL_CONTEXT } from '@pure-model/core'
// 引入 pure-model 的 class-component 适配器
import { provide } from '@pure-model/react'
// 引入自定义 ModelContext
import { EnvContext } from './EnvContext'
// 引入编写好的 ReactModel
import { TestModel } from './TestModel'

// 通过装饰符 decorator 将 TestModel 注入 controller
// 可以传递多个 Model 比如 @provide({ Model1, Model2, Model3 })
@provide({ TestModel })
export default class MyComponent extends React.Component<any, any> {
  /**
   * 将 env 注入 EnvContext
   * 可以通过 {...MyContext0.impl(), ...MyContext1.impl() } 追加多个 context value 注入
   */
  [MODEL_CONTEXT] = {
    ...EnvContext.impl({
      env: 'prod', // 设置 env 即可
    }),
  }

  /**
   * App 组件内部可以使用 TestModel.useState 等 api 了
   * 并且 App 组件不会在 model 的 setupPreloadCallback 完成之前被渲染
   */
  render() {
    return <App />
  }
}

// 不喜欢，或不支持 decorator 的场景，可以使用 HOC 高阶函数的风格
class MyComponent extends React.Component<any, any> {
  /**
   * 将 env 注入 EnvContext
   * 可以通过 {...MyContext0.impl(), ...MyContext1.impl() } 追加多个 context value 注入
   */
  [MODEL_CONTEXT] = {
    ...EnvContext.impl({
      env: 'prod', // 设置 env 即可
    }),
  }

  /**
   * App 组件内部可以使用 TestModel.useState 等 api 了
   * 并且 App 组件不会在 model 的 setupPreloadCallback 完成之前被渲染
   */
  render() {
    return <App />
  }
}

// 可以传递多个 Model 比如 provide({ Model1, Model2, Model3 })(MyComponent)
export default provide({ TestModel })(MyComponent)
```

## Next.js 框架适配 API

`@pure-model/next.js` 提供了对 `next.js` 框架的适配 API

```typescript
// 引入 page 函数
import { page } from '@pure-model/next.js'

page options 参数如下：

- `Models` 对象类型，value 为 `ReactModel`
- `contexts` 数组类型，value 为 `ModelContextValue`，通过 `Context.create(value)` 创建
- `preload` 方法函数，接受两个参数 `models` 实例对象 和 `ctx` 上下文对象，可以在这里进行数据同步

// 引入页面依赖的 Models 模块
import LayoutModel from '../../models/LayoutModel'
import IndexModel from './Model'

// 引入页面的 View 组件
import View from './View'

// 创建一个 Page
const Page = page({
  // 传入所有 Models
  Models: {
    LayoutModel,
    IndexModel,
  },

  /**
   * 可选的 contexts 数组，可以注入 context value
   * 改变 models 内部 setupContext(EnvContext) 获取的 context value
   */
  contexts: [
    EnvContext.create({
      env: 'prod'
    })
  ],

  /**
   * 可选：配置 preload 方法
   * 第一个参数为 models 实例
   * 第二个参数为 NextPageContext
   * 调用 model.actions 方法更新 model
   * 调用 model.store.getState() 获取 model 里的 state
   * 从 ctx 中获取 query/params, pathname 等参数，可传递给各个 models
   * 各 models 之间也可以在 preload 方法里同步数据
   * preload 方法先于 models 内部的 setupPreloadCallback(preloadCallback) 里的 preloadCallback 执行
   */
  preload: async ({ IndexModel }, ctx) => {
    let tab = 'all'

    if (Array.isArray(ctx.query.tab)) {
      tab = ctx.query.tab.join('')
    } else if (ctx.query.tab) {
      tab = ctx.query.tab
    }

    IndexModel.actions.setSearchParams({
      tab: tab,
    })
  },
})

// 用 Page 包裹 View 创建一个 NextPage 组件
export default Page(View)

```

## API 介绍

`pure-model` 的 `setup*` 开头的 api，跟 `react-hooks` 和 `vue-composition-api` 一样，只能用在 `initializer` 函数中。

可以封装自定义的 pure-model hooks `setupXXX` 进行逻辑和功能的复用。

```javascript
// 基础 api
import {
  // 创建 model
  createPureModel,

  // 创建 store
  setupStore,

  // 创建 context
  createModelContext,
  // 合并 context value
  mergeModelContext
  // 使用 context
  setupContext,
  // ModelContextValue 包含的 symbol
  MODEL_CONTEXT,

  // 注册 model.preload 事件
  setupPreloadCallback,
  // 注册 model.start 事件
  setupStartCallback,
  // 注册 model.finish 事件
  setupFinishCallback,

  // 订阅 model store 内部的 state 状态
  subscribe,
  // 订阅 model store 内部的部分 state 状态
  select
} from '@pure-model/core'

// react 组件适配 api
import {
  // 创建绑定到 react 的 model
  createReactModel,
  // 注入 react model 用的 Provider 组件
  Provider,
  // 注入 react model 用的 provide 高阶函数
  provide,
  // 预加载多个 react model 的函数
  preload,
  // 在单个组件内使用 react-model 的 api
  useReactModel,
} from '@pure-model/react'

// immer 适配 api
import {
  // 将 immer reducer 函数变成 plain reducer 函数
  toReducer,
  // 将 immer reducers 对象变成 plain reducers 对象
  toReducers
} from '@pure-model/immer'


// 测试辅助套件 api
import { testHooks } from '@pure-model/test'

// 内置辅助 model hooks api
import { setupCancel, setupSequence, setupInterval } from '@pure-model/hooks'

```

### 基础 API

#### createPureModel(initializer, options?)

创建一个 model

- `initializer` 参数为函数类型，`() => { store, actions }` 返回 store + actions
  - `initializer` 必须为同步的函数，才可以使用 `setup*` 的 pure-model hooks api
- `options` 参数为对象类型
  - `options.preloadedState` 注入预加载状态到 store，对应 redux `createStore` 里的 `preloadedState`
  - `options.context` 注入 model context

```javascript
let model = createPureModel(() => {
  let { store, actions } = setupStore({
    initialState: 0,
    reducers: {
      incre: (state) => state + 1,
      decre: (state) => state - 1,
    },
  })

  return { store, actions }
})

// 触发 setupPreloadCallback
model.preload().then(() => {
  // 触发 setupStartCallback
  model.start()
  // 触发 setupFinishCallback
  model.finish()
})

// 访问 store
model.store.getState()
model.actions.incre()
```

`createPureModel` 返回的 model 包含以下结构

- `model.store` 为 redux store，点击查看[store api](https://redux.js.org/api/store)
- `model.actions` 为 `initializer` 函数返回的 `actions`
- `model.preload()` 触发订阅了 `setupPreloadCallback` 的函数，必须在 start, finish 之前调用
  - 当 `options.preloadedState` 有值时， 意味着 preload 已完成，`model.preload()` 不会生效，会直接跳过
- `model.start()` 触发订阅了 `setupStartCallback` 的函数，必须在 preload 之后调用，finish 之前调用
- `model.finish()` 触发订阅了 `setupFinishCallback` 的函数，必须在 preload, start 之后调用
- `model.isPreloaded()` 返回 `boolean`，判断是否已 preload
- `model.isStarted()` 返回 `boolean`，判断是否已 start
- `model.isFinished()` 返回 `boolean`，判断是否已 finish

`preload|start|finsih` 只在第一次调用时有效。

#### setupStore({ name?, initialState, reducers, devtools?, logger? })

创建 store，`setupStore` 只能用在 `initializer` 函数内部。

- `options.name` 为可选参数，接收字符串类型，将会出现在 redux-devtools 的展示界面上
- `options.initialState` 为必选参数，接收任意类型的纯数据，但不允许是函数或带原型的对象。
- `options.reducers` 为必选参数， { key: reducer } 对象，可以为空对象
- `options.devtools` 为可选参数，接收`boolean`类型，是否开启 redux-devtools（只在运行环境中支持 redux-devtools 时生效），默认为 true
- `options.logger` 为可选参数，接收 `boolean` 类型，是否开启 redux-logger

`setupStore` 的返回值为 { store, actions }，其中

- `store` 为 redux store 对象，点击查看[store api](https://redux.js.org/api/store)
- `actions` 为对 `reducers` 进行了 `bindActionCreators` 封装的对象，跟 `reducers` 拥有相同的 key 结构，但调用时去掉了 `state` 参数，并且会触发 store 内部更新。

注意：setupStore 返回的 actions 跟最后 return 出去的 actions，并无强关联。

- 可以不把 setupStore 返回的 actions return 到外部
- 可以有选择的选取 setupStore 返回的 actions 暴露到外部的部分
- 可以根据 setupStore 返回的 actions 构造异步的或者分组的 actions，打包到一起暴露出去
- 暴露出去的 actions 函数调用时，可以不更新 store。
- 暴露出去的 actions 是 pure-model 里的动作，它可以是 get，也可以是 set，甚至是 noop 什么都不做。
- 暴露出去的 actions 本质上是一组树形结构的函数集合

```javascript
let model = createPureModel(() => {
  let { store, actions } = setupStore({
    initialState: 0,
    reducers: {
      incre: (state) => state + 1,
      decre: (state) => state - 1,
      increBy: (state, step = 1) => state + step,
    },
  })

  actions.incre()
  actions.decre()
  actions.increBy(1)

  // 支持构造异步 action
  let asyncIncreBy2 = async () => {
    await delay(1000)
    actions.increBy(2)
  }

  // 支持将 actions 攒成对象形式。
  let group = {
    decreBy3: () => actions.increBy(-3),
    decreBy4: () => actions.increBy(-4),
  }

  // 支持构造不会更新 store 的 action
  // 相当于 redux 里的 selector
  let getCount = () => {
    return store.getState()
  }

  return {
    store,
    // 打包最后暴露的 actions 结构
    actions: {
      ...actions,
      getCount,
      asyncIncreBy2,
      group,
    },
  }
})
```

#### createModelContext(initialValue) & setupContext(ModelContext) & mergeModelContext(...ModelContxtValue[])

`createModelContext` 和 `setupContext` 跟 react-hooks 的 `React.createContext` 和 `React.useContext` 类似。

`createModelContext(initialValue)` 传递 `initialValue` 初始化的值，并返回一个 `ModelContext` 对象。

`setupContext(MyModelContext)` 在 `initializer` 函数里，访问 `ModelContext` 内部的值。

`createModelContext` 返回的 `ModelContext` 具有一下属性/方法

##### MyModelContext.create(injectedValue)

创建包含 `injectedValue` 的 `ModelContextValue` 对象，可传递给 `createPureModel(initializer, options)` 的第二个参数 `options.context` ， 动态的注入想要变更的 context value。

如果不进行 context value injection 注入，`setupContext` 将会返回 `ModelContext` 的 `initialValue`

可以通过 `mergeModelContext(...modelContextValueList)` 将多个 `model context value` 合并到一起，传递给 `options.context` 配置.

`ModelContextValue` 和 `ModelContext` 不是同一个概念。

`ModelContext` 相当于一个 `Factory` 工厂，可以通过 `ModelContext.create` 创建多个 `ModelContextValue`

`ModelContextValue` 则是一个 `{ [MODEL_CONTEXT]: { key: value } }` 对象，`MODEL_CONTEXT` 这个 `symbol` 标记了该对象是一个 `model context value`。

```typescript
import { createPureModel, createModelContext, setupContext, mergeModelContext  } from '@pure-model/core'

// 定义 CounterContext 的类型
type CounterContextType = {
  count: number
}

// 创建 model context 并传递 initialValue
let CounterContext = createModelContext<CounterContextType>({
  count: 0
})


let counter = createPureModel(
  () => {
    // 通过 setupContext 获取到 CounterContxt 包含的 value
    // 当无注入时，用默认值 initialValue，有注入时，使用注入的 context value
    let { count } = setupContext(CounterContext)
    return setupCounter(count)
  },
  {
    // 动态注入 context
    // mergeModelContext 可以合并多个 context v
    context: mergeModelContext(
      CounterContext.create({
        count: 200
      })
      AnotherContext.create(...)
    )
  }
)
```

##### MyModelContext.impl(injectedValue)

`impl` 方法和 `create` 方法类似，实际上 `create` 内部依赖的 `impl` 方法。

差别在于，`impl` 返回的是 `{ key: value }` 结构，而 `create` 返回的是 `{ [MODEL_CONTEXT]: { key: value } }`，多了一层 `MODEL_CONTEXT`。

`create` 方法返回的结构，可直接用以所有接收 `options.context` 的参数位置。

`impl` 方法返回的结构，需要再构造一个 `MODEL_CONTEXT` 的包装结构，才能用以 `options.context`。

`impl` 的用途通常是，将一个 `object` 或者 `class` 标记为 `ModelContextValue`。

```typescript
import { MODEL_CONTEXT, createModelContext, setupContext } from '@pure-model/core'

// 定义 CounterContext 的类型
type CounterContextType = {
  count: number
}

// 创建 model context 并传递 initialValue
let CounterContext = createModelContext<CounterContextType>({
  count: 0,
})

class Counter {
  constructor(count = 0) {
    this.count = count
  }

  [MODEL_CONTEXT] = {
    // 可以通过 object spread 将多个 context 的 context value 展开到一个对象里
    // 相当于进行了 mergeModelContext 操作
    ...CounterContext.impl({
      count: this.count,
    }),
  }
}

let counter = createPureModel(
  () => {
    // 通过 setupContext 获取到 CounterContxt 包含的 value
    // 当无注入时，用默认值 initialValue，有注入时，使用注入的 context value
    let { count } = setupContext(CounterContext)
    return setupCounter(count)
  },
  {
    // new Counter 的实例包含 MODEL_CONTEXT 这个 key，可以作为 ModelContextValue 注入
    context: new Counter(10),
  },
)
```

#### setupPreloadCallback(listener)

`setupPreloadCallback(listener)` 类似于 react-hooks 的 `useEffect(f)` 注册一个事件，`listener` 它会在 `model.preload()` 时被调用。

正如 `preload` 一词所暗示的，它的用途是预加载数据，支持 `async/await`，在 model.store 被消费前进行数据加载。

可以理解为 `next.js` 的 `getInitialProps` 的功能定位。

`setupPreloadCallback(listener)` 可以被使用多次，以及在 `custom hooks` 里使用，跟 `react-hooks` 类似。

```javascript
createReactModel(() => {
  // 预加载数据，
  // 通常用以获取首屏数据，以及支持 SSR
  setupPreloadCallback(async () => {
    let data = await postJSON('/api', params)
    actions.updateXXX(data)
  })
})
```

#### setupStartCallback(listener)

`setupStartCallback(listener)` 在注册了 `model.start()` 事件，在 `pure-model` 跟 `react component` 进行绑定时，相当于 `componentDidMount` 的生命周期。

`setupStartCallback(listener)` 可以被使用多次，以及在 `custom hooks` 里使用，跟 `react-hooks` 类似。

```javascript
createReactModel(() => {
  // 在 model.store 被 react component 消费后，继续更新
  // 通常用以获取非首屏数据
  setupStartCallback(async () => {
    let data = await postJSON('/api', params)
    actions.updateXXX(data)
  })
})
```

#### setupFinishCallback(listener)

`setupFinishCallback(listener)` 注册了 `model.finish()` 事件，在 `pure-model` 跟 `react component` 进行绑定时，相当于 `componentWillUnmount` 的生命周期。

`setupFinishCallback(listener)` 可以被使用多次，以及在 `custom hooks` 里使用，跟 `react-hooks` 类似。

```javascript
createReactModel(() => {
  let tid: any
  setupStartCallback(() => {
    tid = setInterval(() => {
      console.log('interval')
    }, 1000)
  })

  // 在 model 不需要被消费时，清除定时器
  setupFinishCallback(() => {
    clearInterval(tid)
  })
})
```

#### subscribe(model, listener)

`subscribe(model, listener)` 监听 model 内部的 state，在 state change 时触发 listener(state)

为什么不直接使用 `model.store.subscribe(listener)` 函数？

这是因为，`subscribe(model, listener)` 保证在 `model.preload()` 之前不触发 `listener`。

而 `model.store.subscribe(listener)` 能监听到 `store` 的所有状态变化。

可以按照具体的场景，选择两种不同的方式。

```javascript
let model = createPureModel(() => {
  let { store, actions } = setupStore({
    initialState: 0,
    reducers: {
      incre: (state) => state + 1,
      decre: (state) => state - 1,
    },
  })

  setupPreloadCallback(() => {
    actions.incre()
  })

  return { store, actions }
})

/**
 * 触发两次
 * 一次是 setupPreloadCallback 里的 actions.incre
 * 另一次是 model.start 之后的 model.actions.incre()
 */
model.store.subscribe(() => {
  console.log('store.subscribe', model.store.getState())
})

/**
 * 触发一次
 * model.start 之后的 model.actions.incre()
 */
subscribe(model, (state) => {
  console.log('subscribe', state)
})

// 先 preload，再 start，再 incre
model.preload().then(() => {
  model.start()
  model.actions.incre()
})
```

#### select(options)

`select(options)` 类似于 `subscribe` 但可以更精细地监听 model 内部状态

- `options.model` 为要监听的 model 对象
- `options.selector` 为 state => value 的函数，从 state 中摘取部分状态
- `options.listener(selectedState)` 为监听函数，接收 selector 函数返回的结果
- `options.compare` 为对比函数，当两次 selector(state) 值相等时，不会重复触发 listener，默认是 shallowEqual 的浅对比。

简单用例如下所示：

```typescript
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

  // 交换 a/b 字段的值
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

// 会引起 selector 的值的变化
model.actions.increA()
// 不会引起 selector 的值的变化
model.actions.swap()
// 会引起 selector 的值的变化
model.actions.increB()
// list 在 select 内只会收集到 2 次变化，swap 操作带来的变更被 compare 对比捕获和忽略
expect(list).toEqual([2, 3])
```

### react 组件适配 api

pure-model 提供了适配 react 组件的 api，可以将 model 里的 state 和 actions 用到 react component 里

#### createReactModel(initializer)

`createReactModel(initializer)` 跟 `createPureModel` 类似，只不过它不是立即创建 model，而是创建一个 react-hooks api。

其中，`initializer` 跟 `createPureModel(initializer)` 的 initializer 参数一致。

`createPureModel(initializer)` 返回 `ReactModel` 对象，包含以下内容

- `ReactModel.isReactModel` 为 `true`
- `ReactModel.useState()` 在 `function component` 中使用，获取 model 内部的 store.getState() 并监听其变化，自动刷新视图
- `ReactModel.useActions()` 在 `function component` 中使用，获取 model 内部的 actions 对象
- `ReactModel.Provider` 初始化 `ReactModel` 的 `Provider` 组件，在子组件里使用 `useState/useActions` 时，需要再其父级或者根组件里，挂载 `Model.Provider` 组件。除非通过其它适配器的方式自动注入了 Provider。该组件接收的 props 如下
  - `props.context?` 注入 model context
  - `props.preloadedState` 注入 model store 的 preloadedState 状态
- `ReactModel.preload(context?, preloadedState?) -> { Provider, model, state }` 预加载函数，接收可选的 context 和 preloadeState 参数，返回：
  - `Provider` 为加载过 setupPreloadCallback 数据的 `Provider` 组件，可用以 SSR 渲染 yngy
  - `model` 为实例化的 Model，可以访问 `store/actions/preload/start/finish` 等属性和方法
  - `state` 为 `model.preload` 后的 `model.store.getState()`，可用以传递到客户端，进行 `ReactDOM.hydrate` 等复用处理。

#### Provider 组件

`Provider` 组件跟 `ReactModel.Provider` 相似，只不过它没有绑定任意 `ReactModel`，而是用以管理多个 `ReactModel` 的 `ReactModel.Provider`

将多个 `ReactModel` 及其 `props`，打包成一个数组，`{ Model, context?, preloadedState? }[]`，`Provider` 组件会批量进行组装 `ReactModel.Provider`。

```tsx
import { Provider } from '@pure-model/react'

ReactDOM.render(
  <Provider
    list={[
      { Model: ReactModel0, context: ModelContext0, preloadedState: 10 },
      { Model: ReactModel1, context: ModelContext0, preloadedState: -10 },
    ]}
  >
    <App />
  </Provider>,
  container,
)
```

#### preload({ Model, context?, preloadedState? }[])

`preload` 跟 `Provider` 的关系，类似于 `ReactModel.preload` 和 `ReactModel.Provider` 的关系，只是它们可以处理多个。

- `preload()` 返回的 `Provider` 是已经组合了多个 `ReactModel.Provider` 的产物，可以直接使用。
- `preload()` 返回的 `stateList` 组合了多个 state
- `preload()` 返回的 `modelList` 组合了多个 model

```javascript
let { Provider, stateList, modelList } = await preload([
  { Model: ReactModel0, context: Context0, preloadedState: 10 },
  { Model: ReactModel1, context: Context1, preloadedState: -10 },
])
```

#### useReactModel(ReactModel, options?)

`useReactModel(ReactModel, options?)` 用以在单个组件内实例化 `ReactModel`，而上面的方式是在 `Provider/ReactContext` 层面实例化，让子组件共享同一个 model。

- `options` 参数等同于 `createPureModel(initializer, options?)` 的 `options` 参数，可以参考其文档
- `useReactModel` 返回的值是 `[state, actions]`，即 `ReactModel.useState/ReactModel.actions` 组装到一起。

```jsx
const Test = () => {
  let [state, actions] = useReactModel(MyReactModel, {
    context: MyModelContext,
    preloadedState: myPreloadedState,
  })
}
```

### immer 适配

`@pure-model/immer` 模块提供了 `immer` 适配的 api，可以优化更新 state 的方式

- `toReducer` 将 immer reducer 转换成普通的 reducer 函数
- `toReducers` 将 immer reducers 转换成普通的 reducers 对象

```typescript
import { toReducers, Draft } from '@pure-model/immer'
type State = {
  count: number
}

let initialState: State = {
  count: 10,
}

let model = createPureModel(() => {
  // immer reducer 的 state 为 Draft 对象，可以直接 mutable 修改
  // toReducer 将 immer reducer 转换成普通 reducer，可以分配给 setupStore
  let decre = toReducer((state: Draft<State>) => {
    state.count--
  })

  // toReducers 将一组 immer reducers 转换成普通的 reducers 对象
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
    // 普通 reducers 分配给 setupStore
    reducers: {
      ...reducers,
      decre,
    },
  })

  return store
})
```

### http 接口请求 api

`@pure-model/core` 提供了 `http` 接口交互相关的 api

- `setupFetch() -> fetch(url, options) -> response` 获取到朴素的 `fetch` 方法，返回 `response` 对象，可自行调用 `text|json` 等方法。fetch 相关文档见：https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- `setupGetJSON() -> getJSON(url, query, options) -> json` 获取到 `getJSON` 方法，发送 `GET` 请求，返回 `json` 结果。`query` 参数为对象，将序列化成 `a=1&b=2` 形式，拼接到 `url` 的查询字符串参数中，`options` 同 `fetch(url, options)` 的 `options`
- `setupPostJSON() -> postJSON(url, data, options) -> json` 获取到 `postJSON` 方法，发送 `POST` 请求，返回 `json` 结果。`data` 参数为对象，将被 `JSON.stringify` 序列化并作为 `post body` 发送给接口，`options` 同 `fetch(url, options)` 的 `options`

`url` 参数的补全规则如下：

- 当 url 为绝对路径时，直接使用 url
- 当 url 缺失了协议时（如以 `//` 开头），在 node.js 里补全 `http:` 协议，其它场景补全 `https:`。

```typescript
import {
  // 获取内部绑定了 env 的 fetch 函数
  setupFetch,
  // 获取基于 fetch 函数构造的 getJSON 函数
  setupGetJSON,
  // 获取基于 fetch 函数构造的 postJSON 函数
  setupPostJSON,
} from '@pure-model/core'

let model = createPureModel(() => {
  let fetch = setupFetch()
  let getJSON = setupGetJSON()
  let postJSON = setupPostJSON()

  let getUserInfo = async () => {
    let data = await getJSON('/api', { a: 1, b: 2 })
  }

  let postUserInfo = async (params) => {
    let data = await postJSON('/api', params)
  }

  let fetchX = async () => {
    let response = await fetch('url', {
      method: 'POST',
      body: JSON.stringify({ a: 1, b: 2 }),
    })
    let json = await response.json()
  }
})
```

### 测试辅助套件 api

`@pure-model/test` 提供了方便测试 `setup*` 这类 Hooks 函数的 api

`testHook(fn, context)` 接收 `fn` 函数和 `context` 两个参数，返回 `fn` 函数的返回值。

```typescript
import { testHook } from '@pure-model/test'

// 获取到在 EnvContext 注入的 context value 背景下的 Hooks 结果
let fetch = testHook(
  () => {
    let fetch = setupFetch()
    return { fetch }
  },
  EnvContext.create({
    env,
    platform,
    fetch,
  }),
)

// 后续可以测试 fetch 方法啦。
fetch()
```

### 其它 API

#### setupCancel

setupCancel 可以将一个 task 函数，包装成可以 cancel 取消的形态。

`setupCancel(task, options?)` -> `{ start, cancel }` 。setupCancel 返回 start 函数和 cancel 函数，start 函数接收跟 task 函数一样的参数类型，cancel 函数无参数和返回值。

- task 参数为一个异步函数，必须返回 promise
- options 为可选参数，可以传递一些 callbacks
  - `options.onData(data)` 监听 data 事件，data 为 task 函数返回的数据类型
  - `options.onError(error)` 监听 error 事件，error 为 task 函数运行出错的 error 对象
  - `options.onCancel()` 监听 cancel 事件，调用 cancel 函数时触发。
  - `options.onStart()` 监听 start 事件，调用 start 函数时触发。
  - `options.onFinish()` 监听 finish 事件，不管 task 运行是成功，还是失败，或者被取消，finish 事件都会触发。

可以基于 `setupPostJSON` 和 `setupCancel` 实现可取消的请求处理。

```javascript
import { setupPostJSON } from '@pure-model/core'
import { setupCancel } from '@pure-model/hooks'

const model = createPureModel(() => {
  let postJSON = setupPostJSON()

  let productFetcher = setupCancel(
    async (params) => {
      let data = await postJSON('api/to/product', params)
      return data
    },
    {
      onData: (data) => {
        // 更新 product
        actions.setProduct(data.products)
      },
      onError: (error) => {
        // 更新 error
        actions.setError(error.message)
      },
      onStart: () => {
        // 展示 loading
        actions.showLoading()
      },
      onFinish: () => {
        // 关闭 Loading
        actions.hideLoading()
      },
      onCancel: () => {
        // 取消
        console.log('cancel')
      },
    },
  )

  return {
    store,
    actions: {
      ...actions,
      productFetcher,
    },
  }
})

// 触发 onStart
model.actions.productFetcher.start({
  productId: 0,
})

// 触发 onCancel 和 onFinish
model.actions.productFetcher.cancel()
```

#### setupSequence

`setupSequence(task, options?)` -> `wrapper task function` 将异步的 task 函数，包装成数据触发顺序和调用顺序一致的形态。

`setupSequence(task, options?)` 返回新的函数，该函数接收的参数和返回值跟 task 一致。

- `options.onData(data)` 监听 data 事件，data 为 task 的返回值
- `options.onError(error)` 监听 error 事件，error 为 task 运行时抛出的错误对象

基于 `setupSequence` 我们可以更加简单的实现异步任务的顺序控制。

```javascript
import { setupPostJSON } from '@pure-model/core'
import { setupSequence } from '@pure-model/hooks'

let model = createPureModel(() => {
  let postJSON = setupPostJSON()
  let fetchProduct = setupSequence(
    async (id) => {
      let data = await postJSON('api/to/product', { id })
      return data
    },
    {
      onData: (data) => {
        actions.addProduct(data.product)
      },
      onError: (error) => {
        console.log('error', error)
      },
    },
  )

  return {
    store,
    actions: {
      ...actions,
      fetchProduct,
    },
  }
})[
  // 不管 1, 2, 3, 4 个请求谁先返回，onData 总是按照调用顺序 1, 2, 3, 4 触发
  (1, 2, 3, 4)
].forEach(model.actions.fetchProduct)
```

#### setupInterval

`setupInterval(options?)` -> `{ start(period: number), stop, reset }`

setupInterval 接收一组 callbacks，返回 start 启动定时器函数，stop 停止定时器函数，reset 重置定时器内部 count 状态函数。

- `options.onData(n:number)` 监听定时器的 data 事件，参数 n 为数字，将从 0 开始递增（若 reset 函数被调用，n 重新从 0 开始递增）
- `options.onStart()` 监听定时器的 start 事件，在 start 函数调用时触发
- `options.onStop()` 监听定时器的 stop 事件，在 stop 函数调用时触发（若调用时，定时器未启动，则不触发）
- `options.onReset()` 监听定时器的 reset 事件，在 reset 函数调用时触发（reset 事件不包含 stop，不会停止定时器，仅仅重置状态）

对于 setupInterval 的返回值 `{ start(period: number), stop, reset }`，有：

- `start(period: number)` 根据给定的 period 周期数字，启动定时器。两次调用 start 将取消上一次的定时器（但不触发 onStop）并按照最新的 period 进行计时。
- `stop()` 停用定时器
- `reset()` 重置定时器状态

通过 setInterval() 我们可以更简单地实现轮询接口等功能，配合 `setupStartCallback` 和 `setupFinishCallback` 可以自动启动和停用定时器，跟随 model 的生命周期

```javascript
import { setupStartCallback, setupFinfishCallback } from '@pure-model/core'
import { setupPostJSON } from '@pure-model/core'
import { setupInterval } from '@pure-model/hooks'

let model = createPureModel(() => {
  let postJSON = setupPostJSON()

  let { start, stop, reset } = setupInterval({
    onData: (n) => {
      console.log('data', n)
    },
    onStart: () => {
      console.log('start')
    },
    onStop: () => {
      console.log('stop')
    },
    onReset: () => {
      console.log('reset')
    },
  })

  // 在 model 开始时，启动定时器
  setupStartCallback(() => {
    start(1000)
  })

  // 在 model 生命周期结束时，关闭定时器
  setupFinishCallback(stop)

  return {
    store,
    actions: {
      ...actions,
      fetchProduct,
    },
  }
})[
  // 不管 1, 2, 3, 4 个请求谁先返回，onData 总是按照调用顺序 1, 2, 3, 4 触发
  (1, 2, 3, 4)
].forEach(model.actions.fetchProduct)
```
