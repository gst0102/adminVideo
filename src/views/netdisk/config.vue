<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>规则配置</h2>
        <p>调整资源质量、签到积分、小游戏次数和邀请返利。保存后后端立即按新规则执行。</p>
      </div>
      <el-button :loading="loading" @click="loadData">重载全部</el-button>
    </div>

    <el-tabs v-model="activeTab" class="rule-tabs">
      <el-tab-pane label="资源质量" name="audit">
        <el-form label-width="190px" class="config-form">
          <el-form-item label="上传冻结奖励">
            <el-input-number v-model="auditConfig.upload_reward_points" :min="0" :step="1" />
          </el-form-item>
          <el-form-item label="补链冻结奖励">
            <el-input-number v-model="auditConfig.repair_reward_points" :min="0" :step="1" />
          </el-form-item>
          <el-form-item label="投诉隐藏阈值">
            <el-input-number v-model="auditConfig.report_hide_threshold" :min="1" :step="1" />
            <span class="hint">达到后可用于隐藏/质量预警</span>
          </el-form-item>
          <el-form-item label="自动确认失效阈值">
            <el-input-number v-model="auditConfig.report_confirm_invalid_threshold" :min="1" :step="1" />
            <span class="hint">不同用户投诉达到后自动下架并扣罚，当前建议 2</span>
          </el-form-item>
          <el-form-item label="质量榜高投诉阈值">
            <el-input-number v-model="auditConfig.quality_high_report_threshold" :min="1" :step="1" />
          </el-form-item>
          <el-form-item label="质量榜高解锁阈值">
            <el-input-number v-model="auditConfig.quality_high_unlock_threshold" :min="1" :step="1" />
          </el-form-item>
          <el-form-item label="24h预警投诉阈值">
            <el-input-number v-model="auditConfig.quality_burst_report_threshold" :min="1" :step="1" />
          </el-form-item>
          <el-form-item label="24h预警解锁阈值">
            <el-input-number v-model="auditConfig.quality_burst_unlock_threshold" :min="1" :step="1" />
          </el-form-item>
          <el-form-item label="自动进入待复核池">
            <el-switch v-model="auditConfig.quality_auto_review_pool" />
          </el-form-item>
          <el-form-item label="高投诉自动隐藏">
            <el-switch v-model="auditConfig.quality_auto_hide_high_report" />
          </el-form-item>
          <el-form-item label="短时高解锁高投诉自动隐藏">
            <el-switch v-model="auditConfig.quality_auto_hide_burst" />
          </el-form-item>
          <el-form-item label="失效处罚倍数">
            <el-input-number v-model="auditConfig.invalid_penalty_multiplier" :min="1" :step="1" />
          </el-form-item>
          <el-form-item label="达阈值自动隐藏">
            <el-switch v-model="auditConfig.auto_hide_on_report" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingAudit" @click="saveAudit">保存资源规则</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="签到与小游戏积分" name="points">
        <el-alert
          class="tip"
          type="warning"
          :closable="false"
          title="积分规则会直接影响用户余额和积分流水，建议只在上线前或低峰期调整。"
        />
        <el-form label-width="210px" class="config-form">
          <el-form-item label="积分单位">
            <el-input v-model="pointsConfig.display_unit" />
          </el-form-item>
          <el-form-item label="提现兑换比例">
            <el-input-number v-model="pointsConfig.exchange_rate" :min="1" :step="1" />
            <span class="hint">积分 = 1 元</span>
          </el-form-item>
          <el-form-item label="普通用户签到">
            <el-input-number v-model="pointsConfig.checkin_base_points_normal" :min="0" :step="1" />
            <span class="hint">分/天</span>
          </el-form-item>
          <el-form-item label="会员用户签到">
            <el-input-number v-model="pointsConfig.checkin_base_points_member" :min="0" :step="1" />
            <span class="hint">分/天</span>
          </el-form-item>
          <el-form-item label="签到广告奖励">
            <el-input-number v-model="pointsConfig.checkin_ad_bonus_points" :min="0" :step="1" />
            <span class="hint">分</span>
          </el-form-item>
          <el-form-item label="猜拳赢局积分">
            <el-input-number v-model="pointsConfig.game_rps_win_points" :min="0" :step="1" />
            <span class="hint">分，完整看广告后到账</span>
          </el-form-item>
          <el-form-item label="猜拳输局扣分">
            <el-input-number v-model="pointsConfig.game_rps_lose_points" :max="0" :step="1" />
            <span class="hint">建议填负数，例如 -2</span>
          </el-form-item>
          <el-form-item label="小游戏广告倍数">
            <el-input-number v-model="pointsConfig.game_ad_multiplier" :min="1" :step="1" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingPoints" @click="savePoints">保存积分规则</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="每日任务次数" name="tasks">
        <el-alert
          class="tip"
          type="info"
          :closable="false"
          title="这里控制小游戏每日可玩次数。普通用户当前建议保留 10 次，会员可单独放大。"
        />
        <el-form label-width="210px" class="config-form">
          <el-form-item label="普通用户小游戏次数">
            <el-input-number v-model="taskConfig.daily_game_task_limit_normal" :min="0" :step="1" />
            <span class="hint">次/天</span>
          </el-form-item>
          <el-form-item label="月会员小游戏次数">
            <el-input-number v-model="taskConfig.daily_game_task_limit_member_month" :min="0" :step="1" />
            <span class="hint">次/天</span>
          </el-form-item>
          <el-form-item label="季会员小游戏次数">
            <el-input-number v-model="taskConfig.daily_game_task_limit_member_quarter" :min="0" :step="1" />
            <span class="hint">次/天</span>
          </el-form-item>
          <el-form-item label="年会员小游戏次数">
            <el-input-number v-model="taskConfig.daily_game_task_limit_member_year" :min="0" :step="1" />
            <span class="hint">次/天</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingTasks" @click="saveTasks">保存次数规则</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="邀请返利" name="commission">
        <el-alert
          class="tip"
          type="warning"
          :closable="false"
          title="这里直接影响会员订单后的邀请返利。会员开通走百分比返利，积分包首充固定 20 分不在这里配置。"
        />
        <el-form label-width="210px" class="config-form">
          <el-form-item label="一级好友会员返利">
            <el-input-number v-model="commissionConfig.level1_rate" :min="0" :max="100" :step="1" />
            <span class="hint">% · 当前建议 50%</span>
          </el-form-item>
          <el-form-item label="二级团队会员返利">
            <el-input-number v-model="commissionConfig.level2_rate" :min="0" :max="100" :step="1" />
            <span class="hint">% · 当前建议 5%</span>
          </el-form-item>
          <el-form-item label="冻结结算天数">
            <el-input-number v-model="commissionConfig.settlement_days" :min="0" :step="1" />
            <span class="hint">天，0 表示不设置冻结期</span>
          </el-form-item>
          <el-form-item label="运营规则说明">
            <el-input
              v-model="commissionConfig.rules"
              type="textarea"
              :rows="4"
              maxlength="300"
              show-word-limit
              placeholder="例如：邀请好友购买会员后，返利积分先进入冻结账户，期满后可解冻。"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingCommission" @click="saveCommission">保存邀请返利规则</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="共建计划" name="coBuild">
        <el-alert
          class="tip"
          type="info"
          :closable="false"
          title="这里控制小程序首页跑马灯和「悦享共建计划」页面文案，奖励规则请保留“以平台审核结果为准”。"
        />
        <el-form label-width="170px" class="config-form">
          <el-form-item label="活动开关">
            <el-switch v-model="coBuildConfig.enabled" />
          </el-form-item>
          <el-form-item label="跑马灯文案">
            <el-input v-model="coBuildConfig.announcement_title" maxlength="60" show-word-limit />
          </el-form-item>
          <el-form-item label="跳转地址">
            <el-input v-model="coBuildConfig.announcement_jump_url" />
          </el-form-item>
          <el-form-item label="页面标题">
            <el-input v-model="coBuildConfig.activity_title" />
          </el-form-item>
          <el-form-item label="主标题">
            <el-input v-model="coBuildConfig.main_title" maxlength="40" show-word-limit />
          </el-form-item>
          <el-form-item label="副文案">
            <el-input v-model="coBuildConfig.subtitle" type="textarea" :rows="2" maxlength="160" show-word-limit />
          </el-form-item>
          <el-form-item label="介绍文案">
            <el-input v-model="coBuildConfig.intro_text" type="textarea" :rows="4" maxlength="300" show-word-limit />
          </el-form-item>
          <el-form-item label="奖励标题">
            <el-input v-model="coBuildConfig.reward_title" />
          </el-form-item>
          <el-form-item label="奖励池文案">
            <el-input v-model="coBuildConfig.reward_desc" />
          </el-form-item>
          <el-form-item label="奖励规则">
            <el-input v-model="coBuildConfig.reward_rules" type="textarea" :rows="7" maxlength="600" show-word-limit />
          </el-form-item>
          <el-form-item label="主按钮文案">
            <el-input v-model="coBuildConfig.primary_button_text" />
          </el-form-item>
          <el-form-item label="次按钮文案">
            <el-input v-model="coBuildConfig.secondary_button_text" />
          </el-form-item>
          <el-form-item label="底部口号">
            <el-input v-model="coBuildConfig.footer_slogan" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingCoBuild" @click="saveCoBuild">保存共建计划</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAdminConfigs, getNetdiskAuditConfig, updateAdminConfig, updateNetdiskAuditConfig } from '@/utils/api'
import type { AuditConfig, CoBuildConfig, CommissionRuleConfig, PointsRuleConfig, TaskRuleConfig } from '@/utils/api'

const activeTab = ref('audit')
const loading = ref(false)
const savingAudit = ref(false)
const savingPoints = ref(false)
const savingTasks = ref(false)
const savingCommission = ref(false)
const savingCoBuild = ref(false)

const auditConfig = reactive<AuditConfig>({
  upload_reward_points: 5,
  repair_reward_points: 5,
  report_hide_threshold: 3,
  report_confirm_invalid_threshold: 2,
  quality_high_report_threshold: 3,
  quality_high_unlock_threshold: 5,
  quality_burst_report_threshold: 1,
  quality_burst_unlock_threshold: 3,
  quality_auto_review_pool: true,
  quality_auto_hide_high_report: true,
  quality_auto_hide_burst: false,
  invalid_penalty_multiplier: 1,
  auto_hide_on_report: true,
})

const pointsConfig = reactive<PointsRuleConfig>({
  display_unit: '积分',
  exchange_rate: 100,
  checkin_base_points_normal: 1,
  checkin_base_points_member: 2,
  checkin_ad_bonus_min: 1,
  checkin_ad_bonus_max: 3,
  checkin_ad_bonus_points: 3,
  game_base_points_min: -2,
  game_base_points_max: 4,
  game_rps_win_points: 4,
  game_rps_lose_points: -2,
  game_ad_multiplier: 2,
})

const taskConfig = reactive<TaskRuleConfig>({
  daily_game_task_limit_normal: 10,
  daily_game_task_limit_member_month: 100,
  daily_game_task_limit_member_quarter: 150,
  daily_game_task_limit_member_year: 200,
})

const commissionConfig = reactive<CommissionRuleConfig>({
  level1_rate: 50,
  level2_rate: 5,
  settlement_days: 7,
  rules: '邀请好友购买会员后，返利积分先进入冻结账户，期满后可解冻。',
})

const coBuildConfig = reactive<CoBuildConfig>({
  enabled: true,
  announcement_title: '早期共建用户招募中，百万积分奖励池等你来拿',
  announcement_jump_url: '/pages/netdisk/co-build',
  activity_title: '悦享共建计划',
  main_title: '让每一个好建议，都被看见',
  subtitle: '你能点进这里，说明你比较认可我们，也愿意和我们一起把悦享资源库做得更好。',
  intro_text: '悦享资源库还在持续成长中。发现问题、提出建议、反馈体验、补充资源、完善规则，你的每一次反馈，都可能帮助更多人更快找到有价值的资源。',
  reward_title: '早期共建用户招募中',
  reward_desc: '百万积分奖励池等你来拿',
  reward_rules: '有效反馈、优质建议、重大问题反馈，都有机会获得积分奖励。\n普通有效反馈：10-20积分\n优质问题反馈：20-50积分\n重大问题反馈：50-500积分\n功能建议被采纳：300-500积分\n长期参与共建的用户，还有机会获得「悦享共建者」「荣誉会员」等专属权益。\n奖励以平台审核结果为准，重复提交、虚假反馈、恶意刷反馈不发放奖励。',
  primary_button_text: '提交反馈',
  secondary_button_text: '查看我的记录',
  footer_slogan: '让每一份资源，都有价值。',
})

const loadGenericConfigs = async () => {
  const data = await getAdminConfigs()
  if (data?.stage2_points_config) Object.assign(pointsConfig, data.stage2_points_config)
  if (data?.stage2_task_config) Object.assign(taskConfig, data.stage2_task_config)
  if (data?.commission_settings) Object.assign(commissionConfig, data.commission_settings)
  if (data?.co_build_config) Object.assign(coBuildConfig, data.co_build_config)
}

const loadData = async () => {
  loading.value = true
  try {
    const [audit] = await Promise.all([
      getNetdiskAuditConfig(),
      loadGenericConfigs(),
    ])
    Object.assign(auditConfig, audit)
  } catch (error: any) {
    ElMessage.error(error.message || '配置加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const saveAudit = async () => {
  savingAudit.value = true
  try {
    await updateNetdiskAuditConfig({ ...auditConfig })
    ElMessage.success('资源规则已保存')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    savingAudit.value = false
  }
}

const normalizePointsConfig = (): PointsRuleConfig => ({
  ...pointsConfig,
  display_unit: pointsConfig.display_unit || '积分',
  exchange_rate: Number(pointsConfig.exchange_rate || 100),
  checkin_base_points_normal: Number(pointsConfig.checkin_base_points_normal || 0),
  checkin_base_points_member: Number(pointsConfig.checkin_base_points_member || 0),
  checkin_ad_bonus_min: Number(pointsConfig.checkin_ad_bonus_min || 0),
  checkin_ad_bonus_max: Number(pointsConfig.checkin_ad_bonus_max || 0),
  checkin_ad_bonus_points: Number(pointsConfig.checkin_ad_bonus_points || 0),
  game_base_points_min: Number(pointsConfig.game_rps_lose_points || -2),
  game_base_points_max: Number(pointsConfig.game_rps_win_points || 4),
  game_rps_win_points: Number(pointsConfig.game_rps_win_points || 4),
  game_rps_lose_points: Number(pointsConfig.game_rps_lose_points || -2),
  game_ad_multiplier: Number(pointsConfig.game_ad_multiplier || 1),
})

const savePoints = async () => {
  savingPoints.value = true
  try {
    await updateAdminConfig('stage2_points_config', normalizePointsConfig())
    ElMessage.success('积分规则已保存')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    savingPoints.value = false
  }
}

const normalizeTaskConfig = (): TaskRuleConfig => ({
  daily_game_task_limit_normal: Number(taskConfig.daily_game_task_limit_normal || 0),
  daily_game_task_limit_member_month: Number(taskConfig.daily_game_task_limit_member_month || 0),
  daily_game_task_limit_member_quarter: Number(taskConfig.daily_game_task_limit_member_quarter || 0),
  daily_game_task_limit_member_year: Number(taskConfig.daily_game_task_limit_member_year || 0),
})

const saveTasks = async () => {
  savingTasks.value = true
  try {
    await updateAdminConfig('stage2_task_config', normalizeTaskConfig())
    ElMessage.success('次数规则已保存')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    savingTasks.value = false
  }
}

const normalizeCommissionConfig = (): CommissionRuleConfig => ({
  level1_rate: Number(commissionConfig.level1_rate || 0),
  level2_rate: Number(commissionConfig.level2_rate || 0),
  settlement_days: Number(commissionConfig.settlement_days || 0),
  rules: commissionConfig.rules || '邀请好友购买会员后，返利积分先进入冻结账户，期满后可解冻。',
})

const saveCommission = async () => {
  savingCommission.value = true
  try {
    await updateAdminConfig('commission_settings', normalizeCommissionConfig())
    ElMessage.success('邀请返利规则已保存')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    savingCommission.value = false
  }
}

const normalizeCoBuildConfig = (): CoBuildConfig => ({
  enabled: Boolean(coBuildConfig.enabled),
  announcement_title: coBuildConfig.announcement_title || '早期共建用户招募中，百万积分奖励池等你来拿',
  announcement_jump_url: coBuildConfig.announcement_jump_url || '/pages/netdisk/co-build',
  activity_title: coBuildConfig.activity_title || '悦享共建计划',
  main_title: coBuildConfig.main_title || '让每一个好建议，都被看见',
  subtitle: coBuildConfig.subtitle || '',
  intro_text: coBuildConfig.intro_text || '',
  reward_title: coBuildConfig.reward_title || '早期共建用户招募中',
  reward_desc: coBuildConfig.reward_desc || '百万积分奖励池等你来拿',
  reward_rules: coBuildConfig.reward_rules || '具体奖励以平台审核结果为准。',
  primary_button_text: coBuildConfig.primary_button_text || '提交反馈',
  secondary_button_text: coBuildConfig.secondary_button_text || '查看我的记录',
  footer_slogan: coBuildConfig.footer_slogan || '让每一份资源，都有价值。',
})

const saveCoBuild = async () => {
  savingCoBuild.value = true
  try {
    await updateAdminConfig('co_build_config', normalizeCoBuildConfig())
    ElMessage.success('共建计划已保存')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    savingCoBuild.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.page {
  padding: 22px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-head h2 {
  margin: 0;
  color: #172033;
}

.page-head p {
  margin: 8px 0 0;
  color: #65758b;
}

.rule-tabs {
  max-width: 860px;
}

.config-form {
  max-width: 700px;
  padding-top: 12px;
}

.tip {
  margin: 10px 0 14px;
}

.hint {
  margin-left: 10px;
  color: #7b8794;
  font-size: 13px;
}
</style>
