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
        <button class="task danger" @click="scrollToQuality">
          <b>{{ n(data?.workbench?.quality_alerts) }}</b>
          <span>资源质量预警</span>
        </button>
      </div>
      <div v-if="data?.resource_quality_alerts?.length" class="alert-grid">
        <button v-for="item in data.resource_quality_alerts" :key="`${item.type}-${item.resource_id}`" class="alert-card" @click="openQualityDetail(item.resource_id)">
          <el-tag :type="item.level === 'danger' ? 'danger' : 'warning'">{{ alertTypeText(item.type) }}</el-tag>
          <strong>{{ item.title }}</strong>
          <span>{{ item.message }}</span>
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

    <section class="source-panel">
      <div class="section-head">
        <h2>{{ pointSourceRange === 'today' ? '今日积分来源分布' : '7日积分来源分布' }}</h2>
        <div class="head-actions">
          <span>按流水 source / change_type 聚合</span>
          <el-segmented v-model="pointSourceRange" :options="pointSourceOptions" @change="loadData" />
        </div>
      </div>
      <el-table :data="data?.point_sources || []" border stripe>
        <el-table-column prop="source" label="来源" width="130">
          <template #default="{ row }">{{ sourceText(row.source) }}</template>
        </el-table-column>
        <el-table-column prop="change_type" label="类型" min-width="180">
          <template #default="{ row }">{{ changeTypeText(row.change_type) }}</template>
        </el-table-column>
        <el-table-column prop="count" label="笔数" width="90" align="center" />
        <el-table-column prop="points" label="积分" min-width="180">
          <template #default="{ row }">
            <div class="bar-line" :class="{ spend: row.points < 0 }">
              <span>{{ n(row.points) }}</span>
              <i :style="{ width: barWidth(Math.abs(row.points), sourceMax) }" />
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section ref="qualityPanelRef" class="quality-panel">
      <div class="section-head">
        <h2>资源质量榜</h2>
        <div class="head-actions">
          <span>投诉多、恢复多、解锁多的资源优先排查</span>
          <el-segmented v-model="qualityFilter" :options="qualityFilterOptions" @change="loadQualityRankings" />
        </div>
      </div>
      <el-table v-loading="qualityLoading" :data="qualityRankings" border stripe>
        <el-table-column label="资源" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <button class="resource-title link-title" @click="openQualityDetail(row.resource_id)">
              <strong>{{ row.title }}</strong>
              <span>{{ row.category }} · {{ row.pan }}</span>
            </button>
          </template>
        </el-table-column>
        <el-table-column prop="reports" label="投诉" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.reports > 0 ? 'danger' : 'info'">{{ n(row.reports) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="restores" label="恢复" width="90" align="center" />
        <el-table-column prop="unlocks" label="解锁" width="90" align="center" />
        <el-table-column prop="unlock_users" label="解锁用户" width="100" align="center" />
        <el-table-column prop="recent_reports_24h" label="24h投诉" width="100" align="center" />
        <el-table-column prop="recent_unlocks_24h" label="24h解锁" width="100" align="center" />
        <el-table-column prop="favorites" label="收藏" width="90" align="center" />
        <el-table-column prop="downloads" label="获取" width="90" align="center" />
        <el-table-column prop="score" label="关注度" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'warning'">{{ row.is_active ? '上架' : '隐藏' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openQualityDetail(row.resource_id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="trend-panel">
      <div class="section-head">
        <h2>7 日趋势</h2>
        <span>用户增长、积分流动、上传/投诉</span>
      </div>
      <el-table :data="data?.trends || []" border stripe>
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="new_users" label="新增用户" width="100" align="center" />
        <el-table-column prop="gain_points" label="发放积分" min-width="170">
          <template #default="{ row }">
            <div class="bar-line">
              <span>{{ n(row.gain_points) }}</span>
              <i :style="{ width: barWidth(row.gain_points, trendMax.gain) }" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="spend_points" label="消耗积分" min-width="170">
          <template #default="{ row }">
            <div class="bar-line spend">
              <span>{{ n(row.spend_points) }}</span>
              <i :style="{ width: barWidth(row.spend_points, trendMax.spend) }" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="uploads" label="上传" width="90" align="center" />
        <el-table-column prop="reports" label="投诉" width="90" align="center" />
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { getNetdiskResourceQuality, getOpsDashboard, seedNetdiskReviewDemo } from '@/utils/api'

const router = useRouter()
const loading = ref(false)
const seedLoading = ref(false)
const qualityLoading = ref(false)
const data = ref<any>(null)
const qualityRankings = ref<any[]>([])
const qualityPanelRef = ref<HTMLElement | null>(null)
const pointSourceRange = ref<'today' | '7d'>('today')
const qualityFilter = ref<'all' | 'hidden' | 'high_report' | 'high_unlock'>('all')
const pointSourceOptions = [
  { label: '今日', value: 'today' },
  { label: '7日', value: '7d' },
]
const qualityFilterOptions = [
  { label: '全部', value: 'all' },
  { label: '隐藏资源', value: 'hidden' },
  { label: '高投诉', value: 'high_report' },
  { label: '高解锁', value: 'high_unlock' },
]

const n = (value: any) => Number(value || 0).toLocaleString()
const formatTime = (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')
const go = (path: string) => router.push(path)
const openQualityDetail = (id: string) => router.push(`/resource-quality/${id}`)
const scrollToQuality = () => qualityPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const trendMax = computed(() => {
  const trends = data.value?.trends || []
  return {
    gain: Math.max(...trends.map((item: any) => Number(item.gain_points || 0)), 1),
    spend: Math.max(...trends.map((item: any) => Number(item.spend_points || 0)), 1),
  }
})
const sourceMax = computed(() => Math.max(...(data.value?.point_sources || []).map((item: any) => Math.abs(Number(item.points || 0))), 1))
const barWidth = (value: number, max: number) => `${Math.max(6, Math.round((Number(value || 0) / max) * 100))}%`
const sourceText = (value: string) => ({ netdisk: '网盘', game: '小游戏', checkin: '签到', invite: '邀请', withdraw: '提现', vip: '会员', dev: '开发数据', admin_adjust: '后台调整' }[value] || value)
const changeTypeText = (value: string) => ({
  resource_unlock: '资源解锁消耗',
  upload_reward_frozen: '上传冻结奖励',
  repair_reward_frozen: '补链冻结奖励',
  upload_reward_invalid: '上传失效扣回',
  repair_reward_invalid: '补链失效扣回',
  risk_recovery_collect: '待追缴扣除',
  dev_seed: '开发演示积分',
  game_estimated: '小游戏预估',
  earn: '签到获得',
  ad_bonus: '广告奖励',
}[value] || value)
const alertTypeText = (value: string) => ({
  high_report: '高投诉',
  unlock_report_burst: '高解锁高投诉',
}[value] || value)

const loadData = async () => {
  loading.value = true
  try {
    data.value = await getOpsDashboard(pointSourceRange.value)
    if (qualityFilter.value === 'all') {
      qualityRankings.value = data.value?.resource_quality_rankings || []
    } else {
      await loadQualityRankings()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '运营看板加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const loadQualityRankings = async () => {
  qualityLoading.value = true
  try {
    const result = await getNetdiskResourceQuality({ filter: qualityFilter.value, page_size: 20 })
    qualityRankings.value = result.rankings || []
  } catch (error: any) {
    ElMessage.error(error.message || '资源质量榜加载失败')
  } finally {
    qualityLoading.value = false
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
.activity,
.trend-panel,
.source-panel,
.quality-panel {
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
.activity,
.trend-panel,
.source-panel,
.quality-panel {
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

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.resource-title {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.resource-title strong {
  color: #172033;
  font-weight: 700;
}

.resource-title span {
  color: #697386;
  font-size: 12px;
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
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

.task.danger b {
  color: #b42318;
}

.alert-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.alert-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
}

.alert-card strong {
  color: #172033;
}

.alert-card span {
  color: #8a4b10;
  font-size: 13px;
}

.link-title {
  padding: 0;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.link-title strong {
  color: #0f766e;
}

.bar-line {
  display: grid;
  grid-template-columns: 72px 1fr;
  align-items: center;
  gap: 10px;
}

.bar-line span {
  color: #344054;
  font-variant-numeric: tabular-nums;
}

.bar-line i {
  display: block;
  height: 8px;
  background: #0f766e;
  border-radius: 999px;
}

.bar-line.spend i {
  background: #b45309;
}

@media (max-width: 1100px) {
  .metric-grid,
  .task-grid,
  .alert-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
