<template>
  <div>
    <!-- Alert Banner -->
    <div v-if="hasAlert" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
      <span class="text-2xl">🚨</span>
      <div>
        <p class="text-red-800 font-semibold text-sm">異常警示</p>
        <p class="text-red-600 text-sm">{{ alertMessage }}</p>
      </div>
    </div>

    <!-- Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <StatCard title="平均延遲 (ms)" :value="avgLatency" format="number"
        :warn="avgLatency > 500" />
      <StatCard title="Error Rate" :value="errorRate" format="percent"
        :warn="errorRate > 5" />
      <StatCard title="總請求數 (過去 1hr)" :value="totalRequests" format="number" />
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="API 平均延遲 (每分鐘)" :height="280">
        <Line v-if="healthData.length" :data="latencyChartData" :options="chartOptions" />
      </ChartCard>
      <ChartCard title="Error Rate % (每分鐘)" :height="280">
        <Line v-if="healthData.length" :data="errorChartData" :options="errorChartOptions" />
      </ChartCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import StatCard from '../components/StatCard.vue'
import ChartCard from '../components/ChartCard.vue'
import { useStats } from '../composables/useStats'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const { fetchApiHealth } = useStats()
const healthData = ref<any[]>([])

async function loadData() {
  healthData.value = await fetchApiHealth(60)
}

onMounted(loadData)
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(loadData, 15000) })
onUnmounted(() => clearInterval(timer))

const avgLatency = computed(() => {
  if (!healthData.value.length) return 0
  const sum = healthData.value.reduce((acc: number, d: any) => acc + Number(d.avg_latency), 0)
  return Math.round(sum / healthData.value.length)
})

const errorRate = computed(() => {
  if (!healthData.value.length) return 0
  const totalErr = healthData.value.reduce((acc: number, d: any) => acc + Number(d.error_count), 0)
  const totalReq = healthData.value.reduce((acc: number, d: any) => acc + Number(d.total_requests), 0)
  return totalReq ? +(totalErr / totalReq * 100).toFixed(2) : 0
})

const totalRequests = computed(() =>
  healthData.value.reduce((acc: number, d: any) => acc + Number(d.total_requests), 0)
)

const hasAlert = computed(() => avgLatency.value > 500 || errorRate.value > 5)
const alertMessage = computed(() => {
  const msgs = []
  if (avgLatency.value > 500) msgs.push(`平均延遲 ${avgLatency.value}ms 超過 500ms 閾值`)
  if (errorRate.value > 5) msgs.push(`錯誤率 ${errorRate.value}% 超過 5% 閾值`)
  return msgs.join('；')
})

const labels = computed(() =>
  healthData.value.map((d: any) => {
    const dt = new Date(d.minute)
    return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`
  })
)

const latencyChartData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: '延遲 (ms)',
    data: healthData.value.map((d: any) => Number(d.avg_latency)),
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245,158,11,0.1)',
    fill: true,
    tension: 0.3,
  }],
}))

const errorChartData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Error Rate %',
    data: healthData.value.map((d: any) => Number(d.error_rate)),
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.1)',
    fill: true,
    tension: 0.3,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
}

const errorChartOptions = {
  ...chartOptions,
  scales: { y: { min: 0 } },
}
</script>
