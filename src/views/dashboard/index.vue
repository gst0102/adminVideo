<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card user-card">
          <div class="stat-content">
            <div class="stat-icon"><el-icon :size="40"><User /></el-icon></div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.userCount }}</div>
              <div class="stat-label">总用户数</div>
            </div>
          </div>
          <div class="stat-footer">今日新增：{{ stats.todayCount }}</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card vip-card">
          <div class="stat-content">
            <div class="stat-icon"><el-icon :size="40"><Medal /></el-icon></div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.currentVipCount }}</div>
              <div class="stat-label">当前有效 VIP</div>
            </div>
          </div>
          <div class="stat-footer">累计开通 VIP：{{ stats.totalVipCount }}</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card income-card">
          <div class="stat-content">
            <div class="stat-icon"><el-icon :size="40"><Money /></el-icon></div>
            <div class="stat-info">
              <div class="stat-number">¥{{ stats.totalIncome }}</div>
              <div class="stat-label">总收入</div>
            </div>
          </div>
          <div class="stat-footer">累计收益统计</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card withdrawal-card">
          <div class="stat-content">
            <div class="stat-icon"><el-icon :size="40"><Wallet /></el-icon></div>
            <div class="stat-info">
              <div class="stat-number">¥{{ stats.pendingWithdrawalAmount }}</div>
              <div class="stat-label">待提现总额</div>
            </div>
          </div>
          <div class="stat-footer">处理中笔数：{{ stats.pendingWithdrawals }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>最近注册用户</span></template>
          <el-table :data="recentUsers" stripe size="small">
            <el-table-column prop="nickname" label="昵称" />
            <el-table-column prop="invite_code" label="邀请码" width="120" />
            <el-table-column label="VIP" width="180">
              <template #default="{ row }">
                <div class="vip-status">
                  <el-tag :type="row.is_vip ? 'success' : 'info'" size="small">{{ row.is_vip ? '是' : '否' }}</el-tag>
                  <span>{{ row.vip_expire_at ? formatTime(row.vip_expire_at) : '-' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="注册时间" width="180">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>待处理提现</span></template>
          <el-table :data="pendingWithdrawals" stripe size="small">
            <el-table-column prop="nickname" label="用户" />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">¥{{ Number(row.amount || 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="created_at" label="申请时间" width="180">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag type="warning" size="small">{{ row.transfer_bill_no ? '等待回调' : '待提交转账' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { useAdminStore } from '@/store'

const adminStore = useAdminStore()

const stats = ref({
  userCount: 0,
  totalVipCount: 0,
  currentVipCount: 0,
  todayCount: 0,
  totalIncome: '0.00',
  pendingWithdrawals: 0,
  pendingWithdrawalAmount: '0.00',
})

const recentUsers = ref<any[]>([])
const pendingWithdrawals = ref<any[]>([])

const loadStats = async () => {
  const data = await adminStore.getDashboardStats()
  stats.value = {
    userCount: data.userCount ?? data.user_count ?? 0,
    totalVipCount: data.totalVipCount ?? data.total_vip_count ?? 0,
    currentVipCount: data.vipCount ?? data.vip_count ?? 0,
    todayCount: data.todayNewUsers ?? data.today_new_users ?? 0,
    totalIncome: String(data.totalIncome ?? data.total_income ?? '0.00'),
    pendingWithdrawals: data.pendingWithdrawals ?? data.pending_withdrawals ?? 0,
    pendingWithdrawalAmount: Number(data.pendingWithdrawalAmount ?? data.pending_withdrawal_amount ?? 0).toFixed(2),
  }
}

const loadLists = async () => {
  const usersResult = await adminStore.getUserList(1, 5)
  recentUsers.value = usersResult?.list || []

  const withdrawals = await adminStore.getWithdrawalList('processing')
  const list = Array.isArray(withdrawals) ? withdrawals : withdrawals?.list || []
  pendingWithdrawals.value = list.slice(0, 5)
}

const formatTime = (time: any) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

onMounted(async () => {
  await loadStats()
  await loadLists()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stat-cards .el-col {
  margin-bottom: 20px;
}

.stat-card {
  cursor: default;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.user-card .stat-icon {
  background: linear-gradient(135deg, #409eff, #36d1dc);
}

.vip-card .stat-icon {
  background: linear-gradient(135deg, #67c23a, #95de64);
}

.income-card .stat-icon {
  background: linear-gradient(135deg, #e6a23c, #f7ba2a);
}

.withdrawal-card .stat-icon {
  background: linear-gradient(135deg, #f56c6c, #ff8a8a);
}

.stat-number {
  font-size: 30px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  color: #666;
  margin-top: 4px;
}

.stat-footer {
  margin-top: 16px;
  color: #999;
  font-size: 13px;
}

.vip-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #666;
}
</style>
