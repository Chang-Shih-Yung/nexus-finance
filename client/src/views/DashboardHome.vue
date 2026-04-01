<template>
  <div>
    <!-- Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard title="今日登入人數" :value="overview.today_logins" format="number" />
      <StatCard title="今日交易筆數" :value="overview.today_transactions" format="number" />
      <StatCard title="今日成功率" :value="overview.today_success_rate" format="percent"
        :warn="overview.today_success_rate < 80" />
      <StatCard title="今日活躍用戶" :value="overview.today_active_users" format="number" />
    </div>

    <!-- Trend Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="每日登入人數 (最近 7 天)" :height="280">
        <Line v-if="trendData" :data="loginChartData" :options="chartOptions" />
      </ChartCard>
      <ChartCard title="交易成功率趨勢 (最近 7 天)" :height="280">
        <Line v-if="trendData" :data="successRateChartData" :options="percentOptions" />
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

const { fetchOverview, fetchTrend } = useStats()

const overview = ref({ today_logins: 0, today_transactions: 0, today_success_rate: 0, today_active_users: 0 })
const trendData = ref<any[]>([])

async function loadData() {
  const [ov, trend] = await Promise.all([fetchOverview(), fetchTrend(7)])
  if (ov) overview.value = ov
  if (trend) trendData.value = trend
}

onMounted(loadData)

// Polling every 30s
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(loadData, 30000) })
onUnmounted(() => clearInterval(timer))

const labels = computed(() =>
  trendData.value.map((d: any) => {
    const dt = new Date(d.date)
    return `${dt.getMonth() + 1}/${dt.getDate()}`
  })
)

const loginChartData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: '登入人數',
    data: trendData.value.map((d: any) => Number(d.logins)),
    borderColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.1)',
    fill: true,
    tension: 0.3,
  }],
}))

const successRateChartData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: '成功率 %',
    data: trendData.value.map((d: any) => Number(d.success_rate)),
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.1)',
    fill: true,
    tension: 0.3,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
}

const percentOptions = {
  ...chartOptions,
  scales: { y: { min: 0, max: 100 } },
}
</script>
