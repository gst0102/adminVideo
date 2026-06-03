<template>
  <div class="finance-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card income-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="36"><Coin /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">¥{{ stats.total_income }}</div>
              <div class="stat-label">总收益</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card withdrawn-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="36"><CreditCard /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">¥{{ stats.total_withdrawn }}</div>
              <div class="stat-label">已提现</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card balance-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="36"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">¥{{ stats.total_balance }}</div>
              <div class="stat-label">用户余额</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card frozen-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="36"><Lock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">¥{{ stats.total_frozen }}</div>
              <div class="stat-label">冻结金额</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>提现趋势</span>
              <el-radio-group v-model="daysRange" size="small">
                <el-radio-button :value="7">近7天</el-radio-button>
                <el-radio-button :value="30">近30天</el-radio-button>
                <el-radio-button :value="365">近一年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" style="height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <span>最新提现记录</span>
          </template>
          <el-table :data="recentRecords" stripe size="small">
            <el-table-column prop="nickname" label="用户" width="150" />
            <el-table-column prop="batch_no" label="订单号" width="200" />
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="{ row }">¥{{ parseFloat(row.amount).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTagMap[row.status]?.type || 'info'" size="small">
                  {{ statusTagMap[row.status]?.label || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="申请时间" width="180">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column prop="completed_at" label="处理时间" width="180">
              <template #default="{ row }">{{ formatTime(row.completed_at) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { useAdminStore } from '@/store'

const adminStore = useAdminStore()
const chartRef = ref<HTMLElement>()
const daysRange = ref(7)

const stats = ref({
  total_income: '0.00',
  total_withdrawn: '0.00',
  total_balance: '0.00',
  total_frozen: '0.00'
})

const recentRecords = ref<any[]>([])

const statusTagMap: Record<string, { label: string; type: 'success' | 'primary' | 'warning' | 'info' | 'danger' }> = {
  processing: { label: '处理中', type: 'warning' },
  success: { label: '成功', type: 'success' },
  failed: { label: '失败', type: 'danger' }
}

let chart: echarts.ECharts | null = null

onMounted(async () => {
  await loadStats()
  await loadRecentRecords()
  await nextTick()
  initChart()
})

watch(daysRange, () => {
  updateChart()
})

const loadStats = async () => {
  try {
    const data = await adminStore.getDashboardStats()
    if (data) {
      stats.value = {
        total_income: data.totalIncome ?? data.total_income ?? '0.00',
        total_withdrawn: data.totalWithdrawn ?? data.total_withdrawn ?? '0.00',
        total_balance: data.totalBalance ?? data.total_balance ?? '0.00',
        total_frozen: data.totalFrozen ?? data.total_frozen ?? '0.00'
      }
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const loadRecentRecords = async () => {
  try {
    const result = await adminStore.getWithdrawalList('success')
    const list = Array.isArray(result) ? result : (result?.list || [])
    recentRecords.value = list.slice(0, 10)
  } catch (error) {
    console.error('加载提现记录失败:', error)
  }
}

const initChart = () => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    updateChart()
  }
}

const updateChart = async () => {
  if (!chart) return

  try {
    const result = await adminStore.getWithdrawalStats(daysRange.value)
    const dates = result?.dates || []
    const amounts = result?.amounts || []

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = params[0]
          return `${p.axisValue}<br/>提现金额: ¥${parseFloat(p.value).toFixed(2)}`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          rotate: daysRange.value > 30 ? 45 : 0,
          formatter: (value: string) => dayjs(value).format(daysRange.value > 30 ? 'MM/DD' : 'MM-DD')
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `¥${value}`
        }
      },
      series: [
        {
          type: 'bar',
          data: amounts,
          barWidth: '60%',
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#409EFF' },
              { offset: 1, color: '#79bbff' }
            ])
          }
        }
      ]
    })
  } catch (error) {
    console.error('加载提现图表数据失败:', error)
  }
}

const formatTime = (time: any) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
.finance-container {
  padding: 0;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.income-card .stat-icon {
  background: linear-gradient(135deg, #409EFF, #36d1dc);
}

.withdrawn-card .stat-icon {
  background: linear-gradient(135deg, #67C23A, #4cae4c);
}

.balance-card .stat-icon {
  background: linear-gradient(135deg, #E6A23C, #f7971e);
}

.frozen-card .stat-icon {
  background: linear-gradient(135deg, #F56C6C, #ff6b6b);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
