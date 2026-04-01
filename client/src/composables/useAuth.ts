import axios from 'axios'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'nexus_token'

const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

// 自動在每個請求加上 Authorization header
api.interceptors.request.use((config) => {
    if (token.value) {
        config.headers.Authorization = `Bearer ${token.value}`
    }
    return config
})

// 401 → 清除 token，強制回登入頁
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            token.value = null
            localStorage.removeItem(TOKEN_KEY)
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

export function useAuth() {
    const isLoggedIn = computed(() => !!token.value)

    async function login(username: string, password: string) {
        const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL ?? '/api'}/auth/login`,
            { username, password }
        )
        token.value = data.token
        localStorage.setItem(TOKEN_KEY, data.token)
    }

    function logout() {
        token.value = null
        localStorage.removeItem(TOKEN_KEY)
        window.location.href = '/login'
    }

    return { isLoggedIn, login, logout }
}
