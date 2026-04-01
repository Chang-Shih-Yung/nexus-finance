import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/LoginView.vue'),
            meta: { public: true },
        },
        {
            path: '/',
            redirect: '/dashboard',
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: () => import('../views/DashboardHome.vue'),
        },
        {
            path: '/dashboard/funnel',
            name: 'funnel',
            component: () => import('../views/FunnelView.vue'),
        },
        {
            path: '/dashboard/errors',
            name: 'errors',
            component: () => import('../views/ErrorMonitor.vue'),
        },
        {
            path: '/dashboard/monitor',
            name: 'monitor',
            component: () => import('../views/MonitorView.vue'),
        },
        {
            path: '/ai-query',
            name: 'ai-query',
            component: () => import('../views/AiQueryView.vue'),
        },
    ],
})

// 全域 guard：未登入一律導向 /login
router.beforeEach((to) => {
    const token = localStorage.getItem('nexus_token')
    if (!to.meta.public && !token) {
        return { name: 'login' }
    }
})

export default router
