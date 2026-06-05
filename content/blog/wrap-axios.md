---
title: "封装Axios"
description: "本文详细介绍了为什么要封装 Axios，以及如何通过请求拦截器、响应拦截器、接口模块化和观察者模式构建高可维护性的前端请求架构。内容涵盖 Token 自动注入、统一错误处理、环境配置管理、Service Layer 设计以及请求层与 UI 层解耦实践，帮助开发者打造更加规范、可扩展的 Vue3 前端项目。"
date: 2026-06-05
author: Chanko
authorUrl: /about
category: "前端"
views: 0
workflowStatus: published
published: true
locked: false
pinned: false
tags:
  - Axios
  - "Design Pattern"
---

## 为什么要封装 Axios

封装 Axios 的核心目的是为了提高代码的可维护性、复用性以及统一管理网络请求的逻辑。

### 统一配置

项目通常有统一的后端基础路径、超时时间等。通过封装，你可以一处设置，全局生效：

- BaseURL 管理：根据环境（开发、测试、生产）自动切换不同的 API 地址。
- 超时设置：统一规定请求超过 5 秒或 10 秒即为失败，避免页面无限等待。
- 公共 Header：统一添加 Content-Type 或自定义版本号。

### 请求拦截器：身份校验与预处理（Request Interceptor）

在请求发出之前，自动执行一些逻辑：

- 自动注入 Token：从 localStorage 或 Pinia/Vuex 中取出登录令牌（JWT），自动放入 Authorization 请求头中。
- 防止重复请求：检测是否有相同的请求正在进行，如果有则取消旧请求，防止因用户频繁点击导致的性能损耗或数据错乱。
- 参数预处理：比如对所有 POST 请求的数据进行签名加密。

### 响应拦截器：数据瘦身与统一报错（Response Interceptor）

在组件拿到数据之前，先进行一道过滤：

- 数据“脱壳”：后端通常返回 { code: 200, data: {...}, msg: "success" }。封装后可以让组件直接拿到 data 里的内容，不用每次都写 res.data.data。
- 统一错误处理：
    - HTTP 状态码异常：统一处理 404（未找到）、500（服务器错误）。
    - 业务逻辑异常：比如 code: 401 代表登录失效，拦截器可以直接触发“跳转到登录页”并清空用户信息，而不需要在每个页面都写一遍跳转逻辑。
- 全局 Loading 状态：在请求开始时开启加载动画，在响应结束（无论成功失败）时关闭它。

### 接口模块化管理（Service Layer）

封装后的 Axios 允许我们将接口按功能模块拆分（如 user.js, order.js），而不是直接在页面里写 URL 字符串：

- 语义化调用：userService.getUserInfo() 显然比 axios.get('/api/v1/user/info') 更易读。
- 易于维护：如果后端把 /user 路径改成了 /account，你只需要修改对应的 API 模块文件，而不需要全项目搜索替换字符串。

### 环境切换与兼容性

- 多环境支持：利用环境变量（process.env 或 import.meta.env）在不同环境下配置不同的 API 域名，封装后的代码能自动适应不同的部署环境。
- API 适配：如果未来要切换到 Fetch API 或其他库，封装层可以作为缓冲，只需要改动封装内部，外部业务逻辑无需变动。

### 代码示例与对比

#### 不封装

```js [page.js]
import axios from 'axios'

//如果不封装，每个页面都要写这些重复的代码
axios.get('https://api.example.com/user', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
}).then(res => {
    if (res.data.code === 200) {
        // 处理成功逻辑
    } else {
        // 处理错误逻辑
        // 此处会在其他页面中多次重复出现
    }
}).catch(err => {
    // 处理网络错误
})
```

#### 封装后

::code-group
```js [request.js]
import axios from 'axios'

// 封装 Axios 实例
const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
request.interceptors.request.use(
    config => {
        config.headers['Authorization'] = 'Bearer ' + localStorage.getItem('token')
        // 在发送请求之前做些什么
        return config
    },
    error => {
        // 对请求错误做些什么
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    response => {
        // 对响应数据做点什么
        return response
    },
    error => {
        // 对响应错误做点什么
        return Promise.reject(error)
    }
)
```

```js [user.js]
import request from './request'

// 用户模块接口
export const getUserInfo = () => {
    return request.get('/user/info')
}
```

```js [page.js]
import { getUserInfo } from './user'

// 调用用户模块接口
async function init() {
  try {
    // 自动带 Token、自动处理 401 跳转、自动解构 data、自动弹出错误提示
    this.user = await getUserInfo();
  } catch (err) {
    // 只需要处理特定的业务错误，通用错误已被封装层拦截
  }
}
```
::

## 进一步处理

在这种封装下，还可以再进一步处理。将封装的 Axios 专注与逻辑处理，对于相应的错误处理，我们将其使用 **观察者模式 (Observer Pattern)** 来处理，即：

它只负责发现问题（如 401、500、网络超时）并“广播”出去，而不关心外部是如何处理这些问题的（是弹窗提示，还是重定向，还是仅仅记录日志）。

具体实现如下

```ts [requestObserver.ts]
import type { AxiosRequestConfig } from 'axios'

type RequestEventType = 'ERROR' | 'UNAUTHORIZED' | 'TIMEOUT'

export interface RequestErrorPayload {
  message: string
  code?: number
  config?: AxiosRequestConfig
}

type ObserverCallback = (event: RequestErrorPayload) => void

class RequestObserver {
  private listeners: Map<RequestEventType, ObserverCallback[]> = new Map()

  subscribe(eventType: RequestEventType, callback: ObserverCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }

    this.listeners.get(eventType)?.push(callback)

    return () => this.unsubscribe(eventType, callback)
  }

  unsubscribe(eventType: RequestEventType, callback: ObserverCallback) {
    const existingListeners = this.listeners.get(eventType) || []
    this.listeners.set(
      eventType,
      existingListeners.filter((cb) => cb !== callback),
    )
  }

  onError(callback: ObserverCallback) {
    return this.subscribe('ERROR', callback)
  }
  onUnauthorized(callback: ObserverCallback) {
    return this.subscribe('UNAUTHORIZED', callback)
  }
  onTimeout(callback: ObserverCallback) {
    return this.subscribe('TIMEOUT', callback)
  }

  emit(eventType: RequestEventType, event: RequestErrorPayload) {
    this.listeners.get(eventType)?.forEach((cb) => cb(event))
  }
}

export const requestObserver = new RequestObserver()
```

现在拦截器在发现问题时，调用特定的 emit 方法，将错误信息“广播”出去。

```ts [request.ts]
import axios from 'axios'
import { requestObserver } from './requestObserver'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 5000,
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('coo_token')

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 200) return res

    if (res.code === 401) {
      requestObserver.emit('UNAUTHORIZED', { message: res.msg, code: res.code })
    } else {
      requestObserver.emit('ERROR', { message: res.message, code: res.code })
    }
    return Promise.reject(new Error(res.message))
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      requestObserver.emit('TIMEOUT', { message: 'Timeout', config: error.config })
    } else {
      requestObserver.emit('ERROR', { message: error.message })
    }
    return Promise.reject(error)
  },
)

export default request
```

随后在 UI 层 进行精细化订阅，例如在 `Vue` 中，定义一个组合式函数：

```ts [useRequestManager.ts]
import { onMounted, onUnmounted } from 'vue'
import { requestObserver } from './requestObserver'

// 具体操作自行实现
export function useRequestManager() {
  onMounted(() => {
    const unsubscribeError = requestObserver.onError((err) => {
      console.error('Request Error:', err)
    })
    const unsubscribeUnauthorized = requestObserver.onUnauthorized((err) => {
      console.error('Unauthorized:', err)
    })
    const unsubscribeTimeout = requestObserver.onTimeout((err) => {
      console.error('Timeout:', err)
    })
  })

  onUnmounted(() => {
    unsubscribeError()
    unsubscribeUnauthorized()
    unsubscribeTimeout()
  })
}
```

## 总结

通过以上封装，我们将 Axios 的请求逻辑与错误处理分离开来，使得代码更加清晰、可维护。同时，我们也可以根据实际需求，在 UI 层灵活地处理不同类型的错误，例如弹窗提示、重定向登录页等。
