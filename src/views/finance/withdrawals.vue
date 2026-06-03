<template>
  <div class="withdrawals-container">
    <el-card shadow="hover" class="search-card">
      <el-row :gutter="20" align="middle">
        <el-col :span="10">
          <el-radio-group v-model="statusFilter" size="large" @change="handleFilterChange">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="processing">处理中</el-radio-button>
            <el-radio-button value="success">已到账</el-radio-button>
            <el-radio-button value="failed">失败</el-radio-button>
          </el-radio-group>
        </el-col>
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索用户昵称或批次单号"
            clearable
            @keyup.enter="loadWithdrawals"
            @clear="loadWithdrawals"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6" style="text-align: right">
          <el-button type="primary" @click="loadWithdrawals">刷新</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>提现列表</span>
          <span class="total-text">共 {{ pagination.total }} 条</span>
        </div>
      </template>

      <el-table v-loading="loading" :data="withdrawalList" stripe border>
        <el-table-column type="index" label="#" width="50" />
        <el-table-column label="用户" width="180">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="32" :src="row.avatar">{{ (row.nickname || 'U').charAt(0) }}</el-avatar>
              <span>{{ row.nickname || '未知用户' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="batch_no" label="商户批次单号" width="220" show-overflow-tooltip />
        <el-table-column prop="transfer_bill_no" label="微信转账单号" width="220" show-overflow-tooltip />
        <el-table-column prop="amount" label="金额" width="110" align="center">
          <template #default="{ row }">
            <span class="money">¥{{ Number(row.amount || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagMap[row.status]?.type || 'info'">
              {{ getStatusLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="180">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="completed_at" label="完成时间" width="180">
          <template #default="{ row }">{{ formatTime(row.completed_at) }}</template>
        </el-table-column>
        <el-table-column prop="fail_reason" label="失败原因" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'processing' && !row.transfer_bill_no">
              <el-button type="success" link size="small" @click="handleApprove(row)">提交转账</el-button>
              <el-button type="danger" link size="small" @click="handleReject(row)">驳回</el-button>
            </template>
            <template v-else-if="row.status === 'processing' && row.transfer_bill_no">
              <el-tag type="warning" size="small">等待回调</el-tag>
            </template>
            <template v-else>
              <el-tag size="small" :type="row.status === 'success' ? 'success' : 'danger'">
                {{ row.status === 'success' ? '已完成' : '已结束' }}
              </el-tag>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, prev, pager, next, jumper"
          @current-change="loadWithdrawals"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'approve' ? '提交商家转账' : '驳回提现'" width="500px">
      <template v-if="dialogMode === 'approve'">
        <p>确认向该用户发起微信提现？</p>
        <p class="approve-detail">
          用户：<strong>{{ activeRow?.nickname || '未知用户' }}</strong><br />
          金额：<strong class="money">¥{{ Number(activeRow?.amount || 0).toFixed(2) }}</strong><br />
          批次单号：<strong>{{ activeRow?.batch_no }}</strong>
        </p>
        <p class="helper-text">提交后状态会保持为处理中，直到微信回调成功或失败。</p>
      </template>
      <template v-else>
        <el-input v-model="rejectReason" type="textarea" :rows="4" placeholder="请输入驳回原因" />
      </template>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button :type="dialogMode === 'approve' ? 'success' : 'danger'" @click="submitReview">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { Search } from '@element-plus/icons-vue'
import { useAdminStore } from '@/store'

const adminStore = useAdminStore()
const loading = ref(false)
const statusFilter = ref('')
const searchKeyword = ref('')
const dialogVisible = ref(false)
const dialogMode = ref<'approve' | 'reject'>('approve')
const rejectReason = ref('')
const activeRow = ref<any | null>(null)

const allRows = ref<any[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const statusTagMap: Record<string, { label: string; type: 'success' | 'primary' | 'warning' | 'info' | 'danger' }> = {
  processing: { label: '处理中', type: 'warning' },
  success: { label: '已到账', type: 'success' },
  failed: { label: '失败', type: 'danger' },
}

const withdrawalList = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const filtered = keyword
    ? allRows.value.filter((item) =>
        [item.nickname, item.batch_no, item.transfer_bill_no]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword)),
      )
    : allRows.value

  pagination.total = filtered.length
  const start = (pagination.page - 1) * pagination.pageSize
  return filtered.slice(start, start + pagination.pageSize)
})

const loadWithdrawals = async () => {
  loading.value = true
  try {
    const result = await adminStore.getWithdrawalList(statusFilter.value || undefined)
    allRows.value = Array.isArray(result) ? result : result?.list || []
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const handleFilterChange = () => {
  pagination.page = 1
  loadWithdrawals()
}

const handleApprove = (row: any) => {
  activeRow.value = row
  dialogMode.value = 'approve'
  rejectReason.value = ''
  dialogVisible.value = true
}

const handleReject = (row: any) => {
  activeRow.value = row
  dialogMode.value = 'reject'
  rejectReason.value = ''
  dialogVisible.value = true
}

const submitReview = async () => {
  if (!activeRow.value) return
  try {
    if (dialogMode.value === 'approve') {
      await adminStore.processWithdrawal(activeRow.value.id, 'approve')
      ElMessage.success('已提交转账，等待微信回调')
    } else {
      await adminStore.processWithdrawal(activeRow.value.id, 'reject', rejectReason.value || 'admin_rejected')
      ElMessage.success('已驳回该提现申请')
    }
    dialogVisible.value = false
    await loadWithdrawals()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  }
}

const getStatusLabel = (row: any) => {
  if (row.status === 'processing' && row.transfer_bill_no) return '等待回调'
  return statusTagMap[row.status]?.label || row.status
}

const formatTime = (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')

loadWithdrawals()
</script>

<style scoped>
.withdrawals-container {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.total-text {
  color: #999;
  font-size: 14px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.money {
  color: #f56c6c;
  font-weight: bold;
}

.approve-detail {
  margin-top: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  color: #666;
  line-height: 1.8;
}

.helper-text {
  color: #999;
  font-size: 13px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
