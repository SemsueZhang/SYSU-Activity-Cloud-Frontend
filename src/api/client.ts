import axios from 'axios'
import { ElMessage } from 'element-plus'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
})

// 请求拦截器 — 自动附加 JWT
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 — 统一错误处理
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      ElMessage.error('网络连接失败，请检查后端服务是否运行')
      return Promise.reject(err)
    }
    const { status, data } = err.response
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      ElMessage.warning('登录已过期，请重新登录')
      if (!window.location.pathname.startsWith('/auth/')) {
        const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
        window.location.assign(`/auth/login?redirect=${encodeURIComponent(redirect)}`)
      }
    } else if (status === 403) {
      ElMessage.error('权限不足')
    } else if (status >= 500) {
      ElMessage.error('服务器内部错误')
    } else if (data?.message) {
      ElMessage.error(data.message)
    }
    return Promise.reject(err)
  },
)

export default client
