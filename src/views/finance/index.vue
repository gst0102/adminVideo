<template>
  <div class="finance-container">
    <!-- 收益概览 -->
    <el-row :gutter="20">
      <el-col :span="6" v-for="(item, index) in overviewData" :key="index">
        <el-card shadow="hover" class="overview-card">
          <div class="overview-content">
            <div class="overview-icon" :style="{ background: item.color }">
              <el-icon :size="28"><component :is="item.icon" /></el-icon>
            </div>
            <div class="overview-info">
              <div class="overview-value">{{ item.value }}</div>
              <div class="overview-label">{{ item.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 收益图表 -->
    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>
        <span>收益趋势</span>
      </template>
      <div ref="chartRef" style="height: 400px;"></div>
    </el-card>

    <!-- 提现记录列表 -->
    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>提现记录</span>
          <el-radio-group v-model="statusFilter" size="small" @change="loadWithdrawals">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="1">待处理</el-radio-button>
            <el-radio-button label="2">已完成</el-radio-button>
            <el-radio-button label="3">已失败</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table v-loading="loading" :data="withdrawals" stripe border>
        <el-table-column type="index" label="#" width="50" />
        
        <el-table-column prop="user_name" label="用户" width="120" />
        
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ parseFloat(row.amount).toFixed(2) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="batch_no" label="订单号" min-width="200" />

        <el-table-column prop="transfer_bill_no" label="微信订单号" min-width="200" show-overflow-tooltip />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 2 ? 'success' : row.status === 1 ? 'warning' : 'danger'"
              size="small"
            >
              {{ statusMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="create_time" label="申请时间" width="180">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>

        <el-table-column prop="fail_reason" label="备注/原因" min-width="150" show-overflow-tooltip />

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 1"
              type="success"
              link
              size="small"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 1"
              type="danger"
              link
              size="small"
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '@/store'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

const adminStore = useAdminStore()
const chartRef = ref<HTMLElement>()
const loading = ref(false)
const statusFilter = ref('')
const withdrawals = ref<any[]>([])

let chart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

const overviewData = ref([
  { label: '总提现金额', value: '¥0.00', icon: 'Money', color: '#409EFF' },
  { label: '今日提现', value: '¥0.00', icon: 'Wallet', color: '#67C23A' },
  { label: '成功笔数', value: '0', icon: 'CircleCheck', color: '#E6A23C' },
  { label: '待处理', value: '0', icon: 'Clock', color: '#F56C6C' }
])

const statusMap: Record<number, string> = {
  1: '待确认',
  2: '成功',
  3: '失败'
}

onMounted(async () => {
  await loadWithdrawals()
  await nextTick()
  initChart()

  resizeHandler = () => chart?.resize()
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  chart?.dispose()
  chart = null
})

const loadWithdrawals = async () => {
  loading.value = true
  try {
    const status = statusFilter.value ? parseInt(statusFilter.value) : undefined
    withdrawals.value = await adminStore.getWithdrawalList(status)
    
    // 更新统计数据
    updateOverview()
  } catch (error) {
    console.error('加载提现列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const updateOverview = () => {
  let totalAmount = 0
  let todayAmount = 0
  let successCount = 0
  let pendingCount = 0

  withdrawals.value.forEach((w: any) => {
    totalAmount += parseFloat(w.amount || 0)
    
    if (dayjs(w.create_time).isSame(dayjs(), 'day')) {
      todayAmount += parseFloat(w.amount || 0)
    }

    if (w.status === 2) successCount++
    if (w.status === 1) pendingCount++
  })

  overviewData.value[0].value = `¥${totalAmount.toFixed(2)}`
  overviewData.value[1].value = `¥${todayAmount.toFixed(2)}`
  overviewData.value[2].value = successCount.toString()
  overviewData.value[3].value = pendingCount.toString()
}

const initChart = async () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)

  try {
    const statsData = await adminStore.getWithdrawalStats(7)
    const dates = statsData.dates || []
    const amounts = statsData.amounts || []

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: '{b}<br/>提现额: ¥{c}'
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
          formatter: '¥{value}'
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
          name: '提现金额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#409EFF' },
              { offset: 1, color: '#36d1dc' }
            ]),
            borderRadius: [4, 4, 0, 0]
          },
          barWidth: '60%'
        }
      ]
    })
  } catch (error) {
    console.error('[Finance] 加载提现统计失败:', error)
    chart.setOption({
      title: {
        text: '数据加载失败，请检查云函数连接',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', fontSize: 14 }
      }
    })
  }
}

const handleApprove = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确认通过 ${row.user_name} 的提现申请（¥${parseFloat(row.amount).toFixed(2)}）？`, '确认操作', {
      confirmButtonText: '确认通过',
      cancelButtonText: '取消',
      type: 'success'
    })

    await adminStore.processWithdrawal(row._id, 'approve')
    ElMessage.success('已通过提现申请')
    await loadWithdrawals()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('操作失败:', error)
      ElMessage.error('操作失败: ' + (error.message || '未知错误'))
    }
  }
}

const handleReject = async (row: any) => {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      `请输入拒绝 ${row.user_name} 提现申请的原因：`,
      '拒绝提现',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '请输入拒绝原因'
      }
    )

    await adminStore.processWithdrawal(row._id, 'reject', reason)
    ElMessage.success('已拒绝提现申请')
    await loadWithdrawals()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('操作失败:', error)
      ElMessage.error('操作失败: ' + (error.message || '未知错误'))
    }
  }
}

const viewDetail = (row: any) => {
  ElMessage.info('查看详情（功能开发中）')
}

const formatTime = (time: any) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped>
.finance-container {
  padding: 0;
}

.overview-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.3s;
}

.overview-card:hover {
  transform: translateY(-4px);
}

.overview-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.overview-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.overview-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.overview-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.amount {
  font-weight: bold;
  color: #F56C6C;
}
</style>
