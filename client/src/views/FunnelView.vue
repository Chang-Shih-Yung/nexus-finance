<template>
  <div>
    <ChartCard title="使用者漏斗：登入 → 發起轉帳 → 轉帳成功" :height="320">
      <Bar v-if="funnelData.length" :data="chartData" :options="chartOptions" />
    </ChartCard>

    <!-- Conversion metrics -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6" v-if="funnelData.length">
      <div v-for="(step, i) in funnelData" :key="step.step"
        class="bg-white rounded-xl border border-gray-200 p-4">
        <p class="text-sm text-gray-500">{{ stepLabels[step.step] || step.step }}</p>
        <p class="text-2xl font-bold text-gray-900">{{ step.users.toLocaleString() }}</p>
        <div v-if="i > 0" class="mt-2 text-sm">
          <span class="text-emerald-600">轉換率 {{ step.conversion_rate }}%</span>
          <span class="mx-2 text-gray-300">|</span>
          <span class="text-red-500">流失率 {{ step.drop_off_rate }}%</span>
        </div>
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

const { fetchFunnel } = useStats()
const funnelData = ref<any[]>([])

const stepLabels: Record<string, string> = {
  login: '登入',
  transfer_init: '發起轉帳',
  transfer_success: '轉帳成功',
}

onMounted(async () => {
  funnelData.value = await fetchFunnel()
})

const chartData = computed(() => ({
  labels: funnelData.value.map(d => stepLabels[d.step] || d.step),
  datasets: [{
    label: '不重複使用者數',
    data: funnelData.value.map(d => d.users),
    backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
    borderRadius: 8,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true } },
}
</script>
