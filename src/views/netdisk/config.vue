<template>
  <div class="page">
    <el-form label-width="180px" class="config-form">
      <el-form-item label="上传冻结奖励">
        <el-input-number v-model="config.upload_reward_points" :min="0" :step="1" />
      </el-form-item>
      <el-form-item label="补链冻结奖励">
        <el-input-number v-model="config.repair_reward_points" :min="0" :step="1" />
      </el-form-item>
      <el-form-item label="投诉隐藏阈值">
        <el-input-number v-model="config.report_hide_threshold" :min="1" :step="1" />
      </el-form-item>
      <el-form-item label="质量榜高投诉阈值">
        <el-input-number v-model="config.quality_high_report_threshold" :min="1" :step="1" />
      </el-form-item>
      <el-form-item label="质量榜高解锁阈值">
        <el-input-number v-model="config.quality_high_unlock_threshold" :min="1" :step="1" />
      </el-form-item>
      <el-form-item label="24h预警投诉阈值">
        <el-input-number v-model="config.quality_burst_report_threshold" :min="1" :step="1" />
      </el-form-item>
      <el-form-item label="24h预警解锁阈值">
        <el-input-number v-model="config.quality_burst_unlock_threshold" :min="1" :step="1" />
      </el-form-item>
      <el-form-item label="自动进入待复核池">
        <el-switch v-model="config.quality_auto_review_pool" />
      </el-form-item>
      <el-form-item label="高投诉自动隐藏">
        <el-switch v-model="config.quality_auto_hide_high_report" />
      </el-form-item>
      <el-form-item label="短时高解锁高投诉自动隐藏">
        <el-switch v-model="config.quality_auto_hide_burst" />
      </el-form-item>
      <el-form-item label="失效处罚倍数">
        <el-input-number v-model="config.invalid_penalty_multiplier" :min="1" :step="1" />
      </el-form-item>
      <el-form-item label="达阈值自动隐藏">
        <el-switch v-model="config.auto_hide_on_report" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
        <el-button :loading="loading" @click="loadData">重载</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getNetdiskAuditConfig, updateNetdiskAuditConfig } from '@/utils/api'
import type { AuditConfig } from '@/utils/api'

const loading = ref(false)
const saving = ref(false)
const config = reactive<AuditConfig>({
  upload_reward_points: 5,
  repair_reward_points: 5,
  report_hide_threshold: 3,
  quality_high_report_threshold: 3,
  quality_high_unlock_threshold: 5,
  quality_burst_report_threshold: 1,
  quality_burst_unlock_threshold: 3,
  quality_auto_review_pool: true,
  quality_auto_hide_high_report: false,
  quality_auto_hide_burst: false,
  invalid_penalty_multiplier: 1,
  auto_hide_on_report: true,
})

const loadData = async () => {
  loading.value = true
  try {
    Object.assign(config, await getNetdiskAuditConfig())
  } catch (error: any) {
    ElMessage.error(error.message || '配置加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  try {
    await updateNetdiskAuditConfig({ ...config })
    ElMessage.success('规则配置已保存')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
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

.config-form {
  max-width: 560px;
}
</style>
