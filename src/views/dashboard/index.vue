<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card user-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.userCount }}</div>
              <div class="stat-label">总用户数</div>
            </div>
          </div>
          <div class="stat-footer">
            <span>今日新增: {{ stats.todayCount }}</span>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card vip-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40"><Medal /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.vipCount }}</div>
              <div class="stat-label">VIP会员数</div>
            </div>
          </div>
          <div class="stat-footer">
            <span>占比: {{ ((stats.vipCount / stats.userCount) * 100).toFixed(1) }}%</span>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card income-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">¥{{ stats.totalIncome }}</div>
              <div class="stat-label">总收益（元）</div>
            </div>
          </div>
          <div class="stat-footer">
            <span>累计收益统计</span>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card withdrawal-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40"><Wallet /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.withdrawalCount }}</div>
              <div class="stat-label">提现订单</div>
            </div>
          </div>
          <div class="stat-footer">
            <span>待处理: {{ stats.pendingWithdrawals }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>用户增长趋势</span>
              <el-radio-group v-model="timeRange" size="small">
                <el-radio-button label="week">近7天</el-radio-button>
                <el-radio-button label="month">近30天</el-radio-button>
                <el-radio-button label="year">近一年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" style="height: 400px;"></div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>用户类型分布</span>
          </template>
          <div ref="pieChartRef" style="height: 400px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近操作 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>最近注册用户</span>
          </template>
          <el-table :data="recentUsers" stripe size="small">
            <el-table-column prop="nickname" label="昵称" />
            <el-table-column prop="invite_code" label="邀请码" width="120" />
            <el-table-column prop="is_vip" label="VIP" width="80">
              <template #default="{ row }">
                <el-tag :type="row.is_vip ? 'success' : 'info'" size="small">
                  {{ row.is_vip ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="注册时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>待处理提现</span>
          </template>
          <el-table :data="pendingWithdrawals" stripe size="small">
            <el-table-column prop="user_name" label="用户" />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">
                ¥{{ parseFloat(row.amount).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="create_time" label="申请时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.create_time) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="primary" link size="small">处理</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAdminStore } from '@/store'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

const adminStore = useAdminStore()
const chartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
const timeRange = ref('week')

const stats = ref({
  userCount: 0,
  vipCount: 0,
  todayCount: 0,
  totalIncome: '0.00',
  withdrawalCount: 0,
  pendingWithdrawals: 0
})

const recentUsers = ref<any[]>([])
const pendingWithdrawals = ref<any[]>([])

let lineChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

onMounted(async () => {
  await loadStats()
  await nextTick()
  initCharts()

  resizeHandler = () => {
    lineChart?.resize()
    pieChart?.resize()
  }
  window.addEventListener('resize', resizeHandler)

  try {
    const usersResult = await adminStore.getUserList(1, 5)
    recentUsers.value = usersResult.list

    const withdrawals = await adminStore.getWithdrawalList(1)
    pendingWithdrawals.value = withdrawals.slice(0, 5)
  } catch (e) {
    console.error('加载数据失败:', e)
  }
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  lineChart?.dispose()
  pieChart?.dispose()
  lineChart = null
  pieChart = null
})

watch(timeRange, () => {
  updateChartData()
})

const loadStats = async () => {
  try {
    stats.value = await adminStore.getDashboardStats() as any
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const initCharts = () => {
  if (chartRef.value) {
    lineChart = echarts.init(chartRef.value)
    updateChartData()
  }

  if (pieChartRef.value) {
    pieChart = echarts.init(pieChartRef.value)
    
    pieChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        bottom: '0%'
      },
      series: [
        {
          name: '用户类型',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%'
          },
          data: [
            { value: stats.value.vipCount, name: 'VIP用户', itemStyle: { color: '#409EFF' } },
            { value: stats.value.userCount - stats.value.vipCount, name: '普通用户', itemStyle: { color: '#67C23A' } }
          ]
        }
      ]
    })
  }
}

const updateChartData = async () => {
  if (!lineChart) return

  const days = timeRange.value === 'week' ? 7 : timeRange.value === 'month' ? 30 : 365

  try {
    const growthData = await adminStore.getUserGrowthStats(days)
    const dates = growthData.dates || []
    const userData = growthData.newUsers || []
    const vipData = growthData.newVips || []

    lineChart.setOption({
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['新增用户', '新增VIP']
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
          rotate: days > 30 ? 45 : 0
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '新增用户',
          type: 'line',
          smooth: true,
          data: userData,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
            ])
          },
          itemStyle: { color: '#409EFF' }
        },
        {
          name: '新增VIP',
          type: 'line',
          smooth: true,
          data: vipData,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
              { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
            ])
          },
          itemStyle: { color: '#67C23A' }
        }
      ]
    })
  } catch (error) {
    console.error('[Dashboard] 加载用户增长数据失败:', error)
    lineChart.setOption({
      title: {
        text: '数据加载失败，请检查云函数连接',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', fontSize: 14 }
      }
    })
  }
}

const formatTime = (time: any) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stat-cards .el-col {
  margin-bottom: 20px;
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
  gap: 20px;
}

.stat-icon {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.user-card .stat-icon {
  background: linear-gradient(135deg, #409EFF 0%, #36d1dc 100%);
}

.vip-card .stat-icon {
  background: linear-gradient(135deg, #E6A23C 0%, #f7971e 100%);
}

.income-card .stat-icon {
  background: linear-gradient(135deg, #67C23A 0%, #4cae4c 100%);
}

.withdrawal-card .stat-icon {
  background: linear-gradient(135deg, #F56C6C 0%, #ff6b6b 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}

.stat-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  font-size: 13px;
  color: #666;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
