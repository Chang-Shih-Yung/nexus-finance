<template>
  <div class="max-w-4xl mx-auto">
    <!-- Chat Messages -->
    <div class="space-y-4 mb-6 min-h-[400px]" ref="chatContainer">
      <!-- Welcome -->
      <div v-if="!messages.length" class="text-center py-16">
        <p class="text-4xl mb-4">🤖</p>
        <h3 class="text-xl font-semibold text-gray-800 mb-2">AI 數據查詢助手</h3>
        <p class="text-gray-500 mb-6">用自然語言查詢銀行數據，自動產生 SQL 與圖表</p>
        <div class="flex flex-wrap gap-2 justify-center">
          <button v-for="q in sampleQueries" :key="q"
            @click="sendMessage(q)"
            class="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 transition">
            {{ q }}
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div v-for="(msg, i) in messages" :key="i"
        :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
        <div :class="msg.role === 'user'
          ? 'bg-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-lg'
          : 'bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 max-w-2xl'">
          <p class="whitespace-pre-wrap text-sm">{{ msg.content }}</p>

          <!-- SQL Block -->
          <div v-if="msg.sql" class="mt-3">
            <button @click="msg.showSql = !msg.showSql"
              class="text-xs text-blue-500 hover:underline">
              {{ msg.showSql ? '隱藏 SQL' : '顯示 SQL' }}
            </button>
            <pre v-if="msg.showSql"
              class="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto">{{ msg.sql }}</pre>
          </div>

          <!-- Chart -->
          <div v-if="msg.chartConfig" class="mt-3 h-64">
            <component :is="getChartComponent(msg.chartConfig.type)"
              :data="msg.chartConfig.data"
              :options="msg.chartConfig.options || {}" />
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-start">
        <div class="bg-white border border-gray-200 rounded-2xl px-4 py-3">
          <div class="flex gap-1">
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="sticky bottom-0 bg-gray-50 pt-4">
      <div class="flex gap-3">
        <input
          v-model="input"
          @keydown.enter="sendMessage()"
          type="text"
          placeholder="輸入查詢，例如：這個月 VIP 客戶的轉帳成功率多少？"
          class="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          :disabled="loading"
        />
        <button @click="sendMessage()"
          :disabled="loading || !input.trim()"
          class="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
          送出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, markRaw } from 'vue'
import { Line, Bar, Pie, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { api } from '../composables/useAuth'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
)

interface Message {
  role: 'user' | 'assistant'
  content: string
  sql?: string
  showSql?: boolean
  chartConfig?: any
}

const messages = ref<Message[]>([])
const input = ref('')
const loading = ref(false)
const chatContainer = ref<HTMLElement>()

const sampleQueries = [
  '這個月 VIP 客戶的轉帳成功率多少？',
  '昨天哪些客戶轉帳失敗了？',
  '過去一週每天登入人數趨勢',
  '上個月轉帳金額最高的前 10 位客戶',
  '最近 30 天哪個錯誤代碼最常出現？',
  '哪些客戶超過 7 天沒有登入了？',
]

const chartComponents: Record<string, any> = {
  line: markRaw(Line),
  bar: markRaw(Bar),
  pie: markRaw(Pie),
  doughnut: markRaw(Doughnut),
}

function getChartComponent(type: string) {
  return chartComponents[type] || chartComponents.bar
}

async function sendMessage(text?: string) {
  const query = text || input.value.trim()
  if (!query) return

  input.value = ''
  messages.value.push({ role: 'user', content: query })
  loading.value = true

  await nextTick()
  chatContainer.value?.scrollTo({ top: chatContainer.value.scrollHeight })

  try {
    const { data } = await api.post('/ai/query', { query })
    messages.value.push({
      role: 'assistant',
      content: data.answer,
      sql: data.sql,
      showSql: false,
      chartConfig: data.chartConfig,
    })
  } catch (err: any) {
    messages.value.push({
      role: 'assistant',
      content: err.response?.data?.error || '查詢失敗，請稍後再試。',
    })
  } finally {
    loading.value = false
    await nextTick()
    chatContainer.value?.scrollTo({ top: chatContainer.value.scrollHeight })
  }
}
</script>
