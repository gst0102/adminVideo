<template>
  <div class="quality-detail">
    <div class="toolbar">
      <el-button @click="router.back()">返回</el-button>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
    </div>

    <section class="panel">
      <div class="section-head">
        <div>
          <h2>{{ detail?.resource?.title || '资源质量详情' }}</h2>
          <p>{{ detail?.resource?.category }} · {{ detail?.resource?.pan }} · {{ levelText(detail?.resource?.level) }}</p>
        </div>
        <el-tag :type="detail?.resource?.is_active ? 'success' : 'warning'">
          {{ detail?.resource?.is_active ? '上架' : '隐藏' }}
        </el-tag>
      </div>

      <div class="metric-grid">
        <div class="metric">
          <span>投诉</span>
          <strong>{{ n(detail?.stats?.reports) }}</strong>
          <small>24h {{ n(detail?.stats?.recent_reports_24h) }}</small>
        </div>
        <div class="metric">
          <span>恢复</span>
          <strong>{{ n(detail?.stats?.restores) }}</strong>
          <small>{{ shortTime(detail?.stats?.last_restore_at) }}</small>
        </div>
        <div class="metric">
          <span>解锁</span>
          <strong>{{ n(detail?.stats?.unlocks) }}</strong>
          <small>{{ n(detail?.stats?.unlock_users) }} 个用户</small>
        </div>
        <div class="metric">
          <span>24h解锁</span>
          <strong>{{ n(detail?.stats?.recent_unlocks_24h) }}</strong>
          <small>{{ shortTime(detail?.stats?.last_unlock_at) }}</small>
        </div>
        <div class="metric warning">
          <span>关注度</span>
          <strong>{{ n(detail?.stats?.score) }}</strong>
          <small>投诉权重最高</small>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>投诉记录</h2>
        <span>{{ n(detail?.reports?.length) }} 条</span>
      </div>
      <el-table v-loading="loading" :data="detail?.reports || []" border stripe>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'danger' : 'info'">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="投诉说明" min-width="260" show-overflow-tooltip />
        <el-table-column prop="audit_note" label="处理备注" min-width="220" show-overflow-tooltip />
        <el-table-column prop="user_id" label="用户ID" min-width="220" show-overflow-tooltip />
      </el-table>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>恢复记录</h2>
        <span>{{ n(detail?.restore_logs?.length) }} 条</span>
      </div>
      <el-table v-loading="loading" :data="detail?.restore_logs || []" border stripe>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="admin_name" label="管理员" width="110" />
        <el-table-column prop="note" label="备注" min-width="280" show-overflow-tooltip />
      </el-table>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>最近解锁</h2>
        <span>展示最近 30 条流水，不新增扣分</span>
      </div>
      <el-table v-loading="loading" :data="detail?.unlocks || []" border stripe>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="user_id" label="用户ID" min-width="220" show-overflow-tooltip />
        <el-table-column prop="points_delta" label="积分" width="90" align="center" />
        <el-table-column prop="remark" label="备注" min-width="260" show-overflow-tooltip />
      </el-table>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>最近处理日志</h2>
        <span>资源和投诉相关日志</span>
      </div>
      <el-table v-loading="loading" :data="detail?.recent_logs || []" border stripe>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="admin_name" label="管理员" width="110" />
        <el-table-column prop="action" label="动作" width="150">
          <template #default="{ row }">{{ actionText(row.action) }}</template>
        </el-table-column>
        <el-table-column prop="target_title" label="对象" min-width="220" show-overflow-tooltip />
        <el-table-column prop="note" label="备注" min-width="260" show-overflow-tooltip />
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { getNetdiskResourceQualityDetail } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detail = ref<any>(null)

const n = (value: any) => Number(value || 0).toLocaleString()
const formatTime = (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')
const shortTime = (time?: string) => (time ? dayjs(time).format('MM-DD HH:mm') : '暂无')
const levelText = (value?: string) => ({ normal: '普通', featured: '精选', official: '官方' }[value || ''] || value || '-')
const statusText = (value: string) => ({ pending: '待核验', approved: '已确认', rejected: '已撤销' }[value] || value)
const actionText = (value: string) => ({
  report_confirm: '投诉确认',
  report_reject: '投诉撤销',
  resource_restore: '恢复上架',
  upload_confirm_invalid: '上传失效',
  repair_confirm_invalid: '补链失效',
}[value] || value)

const loadData = async () => {
  loading.value = true
  try {
    detail.value = await getNetdiskResourceQualityDetail(String(route.params.id))
  } catch (error: any) {
    ElMessage.error(error.message || '资源质量详情加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.quality-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.toolbar {
  display: flex;
  gap: 12px;
}

.panel {
  padding: 18px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-head h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
}

.section-head p,
.section-head span {
  margin: 6px 0 0;
  color: #697386;
  font-size: 13px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.metric {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #dfe7ef;
  border-radius: 8px;
}

.metric span,
.metric small {
  color: #697386;
  font-size: 13px;
}

.metric strong {
  display: block;
  margin: 8px 0;
  color: #0f766e;
  font-size: 28px;
}

.metric.warning strong {
  color: #b45309;
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
