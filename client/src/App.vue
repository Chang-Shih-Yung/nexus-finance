<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col shrink-0">
      <div class="p-5 border-b border-slate-700">
        <h1 class="text-xl font-bold tracking-tight">
          <span class="text-emerald-400">Nexus</span> Finance
        </h1>
        <p class="text-xs text-slate-400 mt-1">數據監控 + AI 查詢平台</p>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
          :class="isActive(item.to) ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'"
        >
          <span class="text-lg">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="p-4 border-t border-slate-700">
        <button @click="logout"
          class="w-full text-xs text-slate-400 hover:text-white transition text-left px-2 py-1 rounded hover:bg-slate-800">
          登出
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">{{ currentTitle }}</h2>
        <div class="text-sm text-gray-500">{{ today }}</div>
      </header>
      <div class="p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth'

const route = useRoute()
const { logout } = useAuth()

const navItems = [
  { to: '/dashboard', icon: '📊', label: '即時總覽' },
  { to: '/dashboard/funnel', icon: '🔻', label: '使用者漏斗' },
  { to: '/dashboard/errors', icon: '⚠️', label: '錯誤監控' },
  { to: '/dashboard/monitor', icon: '🖥️', label: 'API 監控' },
  { to: '/ai-query', icon: '🤖', label: 'AI 查詢' },
]

const isActive = (path: string) => route.path === path

const currentTitle = computed(() => {
  const item = navItems.find(n => n.to === route.path)
  return item ? item.label : 'Nexus Finance'
})

const today = new Date().toLocaleDateString('zh-TW', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
})
</script>
