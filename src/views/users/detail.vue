<template>
  <div class="user-detail">
    <el-page-header @back="goBack" content="用户详情" />

    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>基本信息</template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="用户ID">{{ user.id }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ user.nickname || '未设置' }}</el-descriptions-item>
        <el-descriptions-item label="邀请码">
          <el-tag>{{ user.invite_code }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="OpenID">{{ user.openid || '-' }}</el-descriptions-item>
        <el-descriptions-item label="VIP状态">
          <el-tag :type="user.is_vip ? 'success' : 'info'">
            {{ user.is_vip ? '是' : '否' }}
          </el-tag>
          <span v-if="user.is_vip && user.vip_expire_at">
            (到期: {{ formatTime(user.vip_expire_at) }})
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ formatTime(user.created_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>收益数据</template>
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-box total">
            <div class="stat-label">总收益</div>
            <div class="stat-value">¥{{ parseFloat(user.total_income || 0).toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-box new">
            <div class="stat-label">可提现</div>
            <div class="stat-value">¥{{ parseFloat(user.balance || 0).toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-box old">
            <div class="stat-label">已提现</div>
            <div class="stat-value">¥{{ parseFloat(user.total_withdrawn || 0).toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-box frozen">
            <div class="stat-label">冻结金额</div>
            <div class="stat-value">¥{{ parseFloat(user.frozen_balance || 0).toFixed(2) }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>下线统计</template>
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="sub-stat">
            <el-icon :size="32"><User /></el-icon>
            <div>
              <div class="number">{{ user.invite_count || 0 }}人</div>
              <div class="label">一级下线</div>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="sub-stat">
            <el-icon :size="32"><UserFilled /></el-icon>
            <div>
              <div class="number">{{ user.indirect_count || 0 }}人</div>
              <div class="label">二级下线</div>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="sub-stat">
            <el-icon :size="32"><Team /></el-icon>
            <div>
              <div class="number">{{ (user.invite_count || 0) + (user.indirect_count || 0) }}人</div>
              <div class="label">总下线数</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>提现记录</template>
      <el-table v-loading="loadingWithdrawals" :data="withdrawals" stripe size="small">
        <el-table-column prop="batch_no" label="订单号" width="200" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="scope">¥{{ parseFloat(scope.row.amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag
              :type="statusTagMap[scope.row.status]?.type || 'info'"
              size="small"
            >
              {{ statusTagMap[scope.row.status]?.label || scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="180">
          <template #default="scope">{{ formatTime(scope.row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="fail_reason" label="备注" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '@/store'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const user = ref<any>({})
const withdrawals = ref<any[]>([])
const loadingWithdrawals = ref(false)

const statusTagMap: Record<string, { label: string; type: 'success' | 'primary' | 'warning' | 'info' | 'danger' }> = {
  processing: { label: '处理中', type: 'warning' },
  success: { label: '成功', type: 'success' },
  failed: { label: '失败', type: 'danger' }
}

onMounted(async () => {
  const userId = route.params.id as string

  try {
    const result = await adminStore.getUserDetail(userId)
    if (result) {
      user.value = result.user || result
      withdrawals.value = result.withdrawals || []
    }
  } catch (error) {
    console.error('加载用户详情失败:', error)
    ElMessage.error('加载失败')
  }
})

const goBack = () => {
  router.back()
}

const formatTime = (time: any) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped>
.user-detail {
  padding: 0;
}

.stat-box {
  padding: 24px;
  border-radius: 12px;
  text-align: center;
}

.stat-box.total {
  background: linear-gradient(135deg, #409EFF 0%, #36d1dc 100%);
  color: #fff;
}

.stat-box.new {
  background: linear-gradient(135deg, #67C23A 0%, #4cae4c 100%);
  color: #fff;
}

.stat-box.old {
  background: linear-gradient(135deg, #E6A23C 0%, #f7971e 100%);
  color: #fff;
}

.stat-box.frozen {
  background: linear-gradient(135deg, #F56C6C 0%, #ff6b6b 100%);
  color: #fff;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
}

.sub-stat {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
}

.sub-stat .number {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.sub-stat .label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}
</style>
