<template>
  <div class="config-container">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="VIP 配置" name="vip">
        <el-form label-width="150px">
          <el-divider content-position="left">虚拟支付</el-divider>
          <el-alert
            title="AppKey 和 VIRTUAL_PAY_NOTIFY_TOKEN 仍然只从后端环境变量读取；这里维护 AppID、OfferId、环境和会员套餐。"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          />

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="AppID">
                <el-input v-model="vipConfig.virtual_pay_appid" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="OfferId">
                <el-input v-model="vipConfig.virtual_pay_offer_id" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="环境">
                <el-select v-model="vipConfig.virtual_pay_env" style="width: 100%">
                  <el-option label="正式" :value="0" />
                  <el-option label="沙箱" :value="1" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="模式">
                <el-select v-model="vipConfig.virtual_pay_mode" style="width: 100%">
                  <el-option label="代币充值" value="short_series_coin" />
                  <el-option label="道具直购" value="short_series_goods" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="16">
              <el-form-item label="回调地址">
                <el-input
                  v-model="vipConfig.virtual_pay_notify_url"
                  placeholder="https://api.example.com/vip/virtual-pay/notify"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">会员套餐</el-divider>
          <div v-for="pkg in vipConfig.packages" :key="pkg.id" class="package-editor">
            <div class="package-header">
              {{ packageLabelMap[pkg.id] || pkg.id }}
              <span class="package-duration">{{ packageDurationText[pkg.id] || `${pkg.duration_days} 天` }}</span>
            </div>
            <el-row :gutter="20">
              <el-col :span="6">
                <el-form-item label="套餐名称">
                  <el-input v-model="pkg.name" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="现价">
                  <el-input-number v-model="pkg.price" :min="0" :precision="2" :step="1" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="4">
                <el-form-item label="原价">
                  <el-input-number
                    v-model="pkg.original_price"
                    :min="0"
                    :precision="2"
                    :step="1"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="10">
                <el-form-item label="Product ID">
                  <el-input v-model="pkg.product_id" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="服务内容">
              <el-input
                v-model="pkg.benefits_text"
                type="textarea"
                :rows="4"
                placeholder="每行一项，例如：免广告"
              />
            </el-form-item>
          </div>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="提现配置" name="withdrawal">
        <el-form :model="withdrawalConfig" label-width="150px">
          <el-form-item label="功能开关">
            <el-switch v-model="withdrawalConfig.enabled" active-text="启用" inactive-text="停用" />
          </el-form-item>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="最小金额">
                <el-input-number v-model="withdrawalConfig.min_amount" :min="0" :precision="2" :step="0.1" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="最大金额">
                <el-input-number v-model="withdrawalConfig.max_amount" :min="0" :precision="2" :step="1" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="每日总额度">
                <el-input-number v-model="withdrawalConfig.daily_limit" :min="0" :precision="2" :step="10" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="提示文案">
            <el-input v-model="withdrawalConfig.tips" type="textarea" :rows="3" />
          </el-form-item>
          <el-alert
            title="商户号、APIv3 Key、证书序列号、私钥和转账回调地址统一由后端 .env 管理，不在后台页面保存。"
            type="warning"
            :closable="false"
            show-icon
          />
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <div class="save-bar">
      <el-button size="large" @click="handleReset">重置</el-button>
      <el-button type="primary" size="large" :loading="saving" @click="handleSaveAll">保存配置</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '@/store'

const adminStore = useAdminStore()
const activeTab = ref('vip')
const saving = ref(false)

const packageLabelMap: Record<string, string> = {
  month: '月度会员',
  quarter: '季度会员',
  year: '年度会员',
}

const packageDurationMap: Record<string, number> = {
  month: 30,
  quarter: 90,
  year: 365,
}

const packageDurationText: Record<string, string> = {
  month: '固定 1 个月',
  quarter: '固定 1 个季度',
  year: '固定 1 年',
}

const defaultPackages = () => [
  { id: 'month', name: '月度会员', price: 9.9, original_price: 19.9, duration_days: 30, product_id: 'month', benefits_text: '免广告\n专属客服\n高清画质' },
  { id: 'quarter', name: '季度会员', price: 26.9, original_price: 59.7, duration_days: 90, product_id: 'quarter', benefits_text: '免广告\n专属客服\n高清画质\n优先处理' },
  { id: 'year', name: '年度会员', price: 88.8, original_price: 238.8, duration_days: 365, product_id: 'year', benefits_text: '全部权益\n年度优惠\n专属客服\n专属标识' },
]

const vipConfig = reactive({
  virtual_pay_appid: '',
  virtual_pay_offer_id: '',
  virtual_pay_env: 0,
  virtual_pay_mode: 'short_series_coin',
  virtual_pay_notify_url: '',
  packages: defaultPackages(),
})

const withdrawalConfig = reactive({
  enabled: true,
  min_amount: 0.1,
  max_amount: 200,
  daily_limit: 100,
  tips: '提现申请提交后，实际到账以后端回调结果为准。',
})

const originalData = reactive({
  vip: JSON.parse(JSON.stringify(vipConfig)),
  withdrawal: JSON.parse(JSON.stringify(withdrawalConfig)),
})

const normalizeDuration = (id: string, fallback?: number) => packageDurationMap[id] || Number(fallback || 30)

const applyVipConfig = (config: any) => {
  const virtualPay = config?.virtual_pay || {}
  vipConfig.virtual_pay_appid = virtualPay.appid || ''
  vipConfig.virtual_pay_offer_id = virtualPay.offer_id || ''
  vipConfig.virtual_pay_env = Number(virtualPay.env ?? 0)
  vipConfig.virtual_pay_mode = virtualPay.mode || 'short_series_coin'
  vipConfig.virtual_pay_notify_url = virtualPay.notify_url || ''

  const packages = Array.isArray(config?.packages) && config.packages.length ? config.packages : defaultPackages()
  vipConfig.packages = packages.map((item: any) => ({
    id: item.id,
    name: item.name || packageLabelMap[item.id] || item.id,
    price: Number(item.price || 0),
    original_price: Number(item.original_price ?? item.originalPrice ?? item.price ?? 0),
    duration_days: normalizeDuration(item.id, item.duration_days),
    product_id: item.product_id || item.productId || item.id,
    benefits_text: Array.isArray(item.benefits) ? item.benefits.join('\n') : String(item.benefits || ''),
  }))
}

const buildVipSettings = () => ({
  enabled: true,
  virtual_pay: {
    appid: vipConfig.virtual_pay_appid,
    offer_id: vipConfig.virtual_pay_offer_id,
    env: vipConfig.virtual_pay_env,
    mode: vipConfig.virtual_pay_mode,
    notify_url: vipConfig.virtual_pay_notify_url,
  },
  packages: vipConfig.packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    price: Number(pkg.price),
    original_price: Number(pkg.original_price),
    duration_days: normalizeDuration(pkg.id, pkg.duration_days),
    product_id: pkg.product_id,
    benefits: String(pkg.benefits_text || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
  })),
})

const loadAllConfigs = async () => {
  try {
    const vip = await adminStore.getConfig('vip_settings')
    applyVipConfig(vip.config_data || vip)
    originalData.vip = JSON.parse(JSON.stringify(vipConfig))
  } catch {}

  try {
    const withdrawal = await adminStore.getConfig('withdrawal_config')
    Object.assign(withdrawalConfig, withdrawal.config_data || withdrawal)
    originalData.withdrawal = JSON.parse(JSON.stringify(withdrawalConfig))
  } catch {}
}

const handleSaveAll = async () => {
  saving.value = true
  try {
    await adminStore.updateConfig({ type: 'vip_settings', config_data: buildVipSettings() })
    await adminStore.updateConfig({ type: 'withdrawal_config', config_data: { ...withdrawalConfig } })
    originalData.vip = JSON.parse(JSON.stringify(vipConfig))
    originalData.withdrawal = JSON.parse(JSON.stringify(withdrawalConfig))
    ElMessage.success('配置已保存到数据库')
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleReset = () => {
  Object.assign(vipConfig, JSON.parse(JSON.stringify(originalData.vip)))
  Object.assign(withdrawalConfig, JSON.parse(JSON.stringify(originalData.withdrawal)))
  ElMessage.info('已恢复到上次保存的配置')
}

loadAllConfigs()
</script>

<style scoped>
.config-container {
  padding: 0;
}

.package-editor {
  padding: 16px 0 4px;
  border-top: 1px solid #f0f0f0;
}

.package-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.package-duration {
  font-size: 12px;
  font-weight: 500;
  color: #909399;
}

.save-bar {
  position: sticky;
  bottom: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
</style>
