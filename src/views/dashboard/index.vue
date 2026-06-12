<template>
  <div class="dashboard">
    <div class="toolbar">
      <el-button type="primary" :loading="loading" @click="loadData">刷新看板</el-button>
      <el-button :loading="seedLoading" @click="seedDemo">生成演示数据</el-button>
      <span class="stamp">更新时间：{{ formatTime(data?.generated_at) }}</span>
    </div>

    <section class="metric-grid">
      <div class="metric-card">
        <span>今日新增用户</span>
        <strong>{{ n(data?.users?.today_new) }}</strong>
        <small>累计 {{ n(data?.users?.total) }} 人</small>
      </div>
      <div class="metric-card">
        <span>今日发放积分</span>
        <strong>{{ n(data?.points?.today_gain_points) }}</strong>
        <small>{{ n(data?.points?.today_gain_users) }} 人获得</small>
      </div>
      <div class="metric-card">
        <span>今日消耗积分</span>
        <strong>{{ n(data?.points?.today_spend_points) }}</strong>
        <small>{{ n(data?.points?.today_spend_users) }} 人消耗</small>
      </div>
      <div class="metric-card">
        <span>当前可用积分</span>
        <strong>{{ n(data?.points?.consumable_total) }}</strong>
        <small>冻结 {{ n(data?.points?.frozen_total) }} 分</small>
      </div>
      <div class="metric-card warning">
        <span>待追缴积分</span>
        <strong>{{ n(data?.points?.risk_due_total) }}</strong>
        <small>{{ n(data?.workbench?.open_risk_records) }} 条风控记录</small>
      </div>
    </section>

    <section class="workbench">
      <div class="section-head">
        <h2>今日待处理</h2>
        <span>按运营动作优先级排序</span>
      </div>
      <div class="task-grid">
        <button class="task" @click="go('/review')">
          <b>{{ n(data?.workbench?.pending_uploads) }}</b>
          <span>待审核上传</span>
        </button>
        <button class="task" @click="go('/review?tab=repairs')">
          <b>{{ n(data?.workbench?.pending_repairs) }}</b>
          <span>待审核补链</span>
        </button>
        <button class="task" @click="go('/review?tab=reports')">
          <b>{{ n(data?.workbench?.pending_reports) }}</b>
          <span>待核验投诉</span>
        </button>
        <button class="task" @click="go('/resources?active=false')">
          <b>{{ n(data?.workbench?.hidden_resources) }}</b>
          <span>隐藏资源</span>
        </button>
        <button class="task" @click="go('/risks')">
          <b>{{ n(data?.workbench?.open_risk_records) }}</b>
          <span>待追缴记录</span>
        </button>
      </div>
    </section>

    <section class="activity">
      <div class="section-head">
        <h2>今日资源活动</h2>
      </div>
      <el-descriptions border :column="3">
        <el-descriptions-item label="今日上传">{{ n(data?.today_activity?.uploads) }}</el-descriptions-item>
        <el-descriptions-item label="今日补链">{{ n(data?.today_activity?.repairs) }}</el-descriptions-item>
        <el-descriptions-item label="今日投诉">{{ n(data?.today_activity?.reports) }}</el-descriptions-item>
      </el-descriptions>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { getOpsDashboard, seedNetdiskReviewDemo } from '@/utils/api'

const router = useRouter()
const loading = ref(false)
const seedLoading = ref(false)
const data = ref<any>(null)

const n = (value: any) => Number(value || 0).toLocaleString()
const formatTime = (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')
const go = (path: string) => router.push(path)

const loadData = async () => {
  loading.value = true
  try {
    data.value = await getOpsDashboard()
  } catch (error: any) {
    ElMessage.error(error.message || '运营看板加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const seedDemo = async () => {
  seedLoading.value = true
  try {
    await seedNetdiskReviewDemo()
    ElMessage.success('演示数据已生成')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '生成演示数据失败')
  } finally {
    seedLoading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.stamp {
  color: #697386;
  font-size: 13px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.metric-card,
.workbench,
.activity {
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.metric-card {
  padding: 18px;
}

.metric-card span,
.metric-card small {
  color: #697386;
  font-size: 13px;
}

.metric-card strong {
  display: block;
  margin: 10px 0 8px;
  color: #172033;
  font-size: 30px;
}

.metric-card.warning strong {
  color: #b45309;
}

.workbench,
.activity {
  margin-top: 18px;
  padding: 18px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-head h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
}

.section-head span {
  color: #8a96a8;
  font-size: 13px;
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.task {
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background: #f8fafc;
  border: 1px solid #dfe7ef;
  border-radius: 8px;
}

.task b {
  display: block;
  margin-bottom: 8px;
  color: #0f766e;
  font-size: 26px;
}

.task span {
  color: #344054;
}

@media (max-width: 1100px) {
  .metric-grid,
  .task-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
