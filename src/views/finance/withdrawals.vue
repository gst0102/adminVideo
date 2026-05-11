<template>
  <div class="withdrawals-container">
    <!-- 筛选栏 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable>
            <el-option label="待处理" :value="1" />
            <el-option label="已完成" :value="2" />
            <el-option label="已失败" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户">
          <el-input v-model="filterForm.keyword" placeholder="昵称/订单号" clearable />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
          <el-button type="success" icon="Download" @click="exportData">导出</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据统计 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="6" v-for="(item, index) in statCards" :key="index">
        <div class="stat-card" :style="{ borderTopColor: item.color }">
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 提现列表 -->
    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>
        <span>提现记录列表</span>
      </template>

      <el-table
        v-loading="loading"
        :data="list"
        stripe
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />

        <el-table-column prop="user_name" label="用户" width="120" fixed="left">
          <template #default="{ row }">
            <el-link type="primary">{{ row.user_name || '未知' }}</el-link>
          </template>
        </el-table-column>

        <el-table-column prop="amount" label="提现金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ parseFloat(row.amount).toFixed(2) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="batch_no" label="商户订单号" min-width="220" show-overflow-tooltip />

        <el-table-column prop="transfer_bill_no" label="微信转账单号" min-width="200" show-overflow-tooltip />

        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="statusTagMap[row.status]?.type || 'info'"
              effect="dark"
              size="small"
            >
              {{ statusTagMap[row.status]?.label || '未知' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="ip" label="IP地址" width="140" />

        <el-table-column prop="create_time" label="申请时间" width="180">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>

        <el-table-column prop="callback_time" label="回调时间" width="180">
          <template #default="{ row }">
            {{ row.callback_time ? formatTime(row.callback_time) : '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="fail_reason" label="备注/失败原因" min-width="150" show-overflow-tooltip />

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 1">
              <el-button type="success" link size="small" @click="handleApprove(row)">
                通过
              </el-button>
              <el-button type="danger" link size="small" @click="handleReject(row)">
                拒绝
              </el-button>
            </template>
            <template v-else-if="row.status === 2">
              <el-button type="primary" link size="small" @click="viewDetail(row)">
                查看
              </el-button>
            </template>
            <template v-else>
              <el-button type="warning" link size="small" @click="handleRetry(row)">
                重试
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 批量操作栏 -->
      <div class="batch-actions" v-if="selectedList.length > 0">
        <span>已选择 {{ selectedList.length }} 项</span>
        <el-button type="success" size="small" @click="batchApprove">批量通过</el-button>
        <el-button type="danger" size="small" @click="batchReject">批量拒绝</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '@/store'
import dayjs from 'dayjs'

const adminStore = useAdminStore()

const loading = ref(false)
const list = ref<any[]>([])
const selectedList = ref<any[]>([])

const filterForm = reactive({
  status: undefined as number | undefined,
  keyword: '',
  dateRange: [] as string[]
})

const statCards = ref([
  { label: '总申请数', value: '0', color: '#409EFF' },
  { label: '总金额', value: '¥0.00', color: '#67C23A' },
  { label: '成功笔数', value: '0', color: '#E6A23C' },
  { label: '待处理', value: '0', color: '#F56C6C' }
])

const statusTagMap: Record<number, { label: string; type: string }> = {
  1: { label: '待确认', type: 'warning' },
  2: { label: '成功', type: 'success' },
  3: { label: '失败', type: 'danger' }
}

onMounted(() => {
  loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    const status = filterForm.status !== undefined ? filterForm.status : undefined
    list.value = await adminStore.getWithdrawalList(status)
    
    // 更新统计数据
    updateStats()
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  let total = list.value.length
  let totalAmount = 0
  let successCount = 0
  let pendingCount = 0

  list.value.forEach((item: any) => {
    totalAmount += parseFloat(item.amount || 0)
    if (item.status === 2) successCount++
    if (item.status === 1) pendingCount++
  })

  statCards.value[0].value = total.toString()
  statCards.value[1].value = `¥${totalAmount.toFixed(2)}`
  statCards.value[2].value = successCount.toString()
  statCards.value[3].value = pendingCount.toString()
}

const handleSearch = () => {
  // 实际应该根据筛选条件查询，这里简化处理
  loadData()
}

const handleReset = () => {
  filterForm.status = undefined
  filterForm.keyword = ''
  filterForm.dateRange = []
  loadData()
}

const exportData = () => {
  ElMessage.info('导出功能开发中')
}

const handleSelectionChange = (selection: any[]) => {
  selectedList.value = selection
}

const handleApprove = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确认通过用户 "${row.user_name}" 的提现申请？\n金额：¥${parseFloat(row.amount).toFixed(2)}`,
      '确认通过',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'success' }
    )

    await adminStore.processWithdrawal(row._id, 'approve')
    ElMessage.success('已通过提现申请')
    await loadData()
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
      '请输入拒绝原因：',
      '拒绝提现',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '请输入原因'
      }
    )

    await adminStore.processWithdrawal(row._id, 'reject', reason)
    ElMessage.success('已拒绝提现申请')
    await loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('操作失败:', error)
      ElMessage.error('操作失败: ' + (error.message || '未知错误'))
    }
  }
}

const handleRetry = async (row: any) => {
  ElMessage.info(`重试提现（功能开发中）`)
}

const batchApprove = async () => {
  try {
    await ElMessageBox.confirm(
      `确认批量通过 ${selectedList.value.length} 条提现申请？`,
      '批量操作',
      { type: 'warning' }
    )

    for (const row of selectedList.value) {
      await adminStore.processWithdrawal(row._id, 'approve')
    }

    ElMessage.success(`已批量通过 ${selectedList.value.length} 条提现申请`)
    selectedList.value = []
    await loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('操作失败:', error)
      ElMessage.error('批量操作失败: ' + (error.message || '未知错误'))
    }
  }
}

const batchReject = async () => {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      `请输入批量拒绝 ${selectedList.value.length} 条申请的原因：`,
      '批量拒绝',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '请输入原因'
      }
    )

    for (const row of selectedList.value) {
      await adminStore.processWithdrawal(row._id, 'reject', reason)
    }

    ElMessage.success(`已批量拒绝 ${selectedList.value.length} 条提现申请`)
    selectedList.value = []
    await loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('操作失败:', error)
      ElMessage.error('批量操作失败: ' + (error.message || '未知错误'))
    }
  }
}

const viewDetail = (row: any) => {
  ElMessage.info(`查看详情：${row.batch_no}`)
}

const formatTime = (time: any) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped>
.withdrawals-container {
  padding: 0;
}

.filter-card .el-form-item {
  margin-bottom: 0;
}

.stat-card {
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  border-top: 4px solid #409EFF;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #999;
}

.amount {
  font-weight: bold;
  color: #F56C6C;
  font-size: 15px;
}

.batch-actions {
  margin-top: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
