<template>
  <div>
    <!-- Error Code Distribution -->
    <ChartCard title="錯誤代碼分佈" :height="300">
      <Bar v-if="errorData.length" :data="chartData" :options="chartOptions" />
    </ChartCard>

    <!-- Failed Transaction Table -->
    <div class="bg-white rounded-xl border border-gray-200 mt-6 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100">
        <h3 class="text-sm font-medium text-gray-600">最近失敗交易明細</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">時間</th>
              <th class="px-4 py-3 font-medium">客戶</th>
              <th class="px-4 py-3 font-medium">等級</th>
              <th class="px-4 py-3 font-medium">金額</th>
              <th class="px-4 py-3 font-medium">管道</th>
              <th class="px-4 py-3 font-medium">錯誤代碼</th>
              <th class="px-4 py-3 font-medium">錯誤訊息</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="tx in failedTx" :key="tx.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-600">{{ formatTime(tx.created_at) }}</td>
              <td class="px-4 py-3 font-medium text-gray-900">{{ tx.user_name }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="tierClass(tx.tier)">{{ tx.tier }}</span>
              </td>
              <td class="px-4 py-3 text-right font-mono">{{ Number(tx.amount).toLocaleString() }}</td>
              <td class="px-4 py-3 text-gray-500">{{ tx.channel }}</td>
              <td class="px-4 py-3">
                <span class="text-red-600 font-mono text-xs">{{ tx.error_code }}</span>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ tx.error_message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import ChartCard from '../components/ChartCard.vue'
import { useStats } from '../composables/useStats'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { fetchErrorBreakdown, fetchFailedTransactions } = useStats()
const errorData = ref<any[]>([])
const failedTx = ref<any[]>([])

onMounted(async () => {
  const [errors, txs] = await Promise.all([
    fetchErrorBreakdown(),
    fetchFailedTransactions(30),
  ])
  errorData.value = errors
  failedTx.value = txs
})

const chartData = computed(() => ({
  labels: errorData.value.map(d => d.error_code),
  datasets: [{
    label: '次數',
    data: errorData.value.map(d => Number(d.count)),
    backgroundColor: '#ef4444',
    borderRadius: 6,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
}

function tierClass(tier: string) {
  const map: Record<string, string> = {
    premium: 'bg-purple-100 text-purple-700',
    vip: 'bg-amber-100 text-amber-700',
    general: 'bg-gray-100 text-gray-600',
  }
  return map[tier] || map.general
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>
