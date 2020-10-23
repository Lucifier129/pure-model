import { setupStore } from '@pure-model/core'
import { createReactModel } from '@pure-model/react'

export type UserInfo = {
  loginname: string
  avatar_url: string
}

export type LayoutState = {
  pageTitle: ''
  fixedHeader: boolean
  showAddButton: boolean
  showMenu: boolean
  messageCount: number
  loadingText: string
  alertText: string
  userInfo?: UserInfo
}

export const initialState: LayoutState = {
  showMenu: false,
  messageCount: 0,
  pageTitle: '',
  fixedHeader: true,
  showAddButton: false,
  loadingText: '',
  alertText: '',
}

export default createReactModel(() => {
  let { store, actions } = setupStore({
    name: 'LayoutModel',
    initialState,
    reducers: {
      openMenu: (state: LayoutState) => {
        return {
          ...state,
          showMenu: true,
        }
      },
      closeMenu: (state: LayoutState) => {
        return {
          ...state,
          showMenu: false,
        }
      },
      setMessageCount: (state: LayoutState, messageCount: number) => {
        return {
          ...state,
          messageCount,
        }
      },
      setUserInfo: (state: LayoutState, userInfo: UserInfo) => {
        return {
          ...state,
          userInfo: userInfo,
        }
      },
      showLoading: (state: LayoutState, loadingText: string) => {
        return {
          ...state,
          loadingText,
        }
      },
      hideLoading: (state: LayoutState) => {
        return {
          ...state,
          loadingText: '',
        }
      },
      showAlert: (state: LayoutState, alertText: string) => {
        return {
          ...state,
          alertText,
        }
      },
      hideAlert: (state: LayoutState) => {
        return {
          ...state,
          alertText: '',
        }
      },
    },
  })

  return {
    store,
    actions,
  }
})
