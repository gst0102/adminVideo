<template>
  <div class="config-container">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="VIP会员配置" name="vip">
        <el-form :model="vipConfig" label-width="160px">
          <el-divider content-position="left">VIP价格设置</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="月度VIP价格">
                <el-input-number v-model="vipConfig.month_price" :min="0" :precision="2" :step="1" />
                <span class="unit">元</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="季度VIP价格">
                <el-input-number v-model="vipConfig.quarter_price" :min="0" :precision="2" :step="1" />
                <span class="unit">元</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="年度VIP价格">
                <el-input-number v-model="vipConfig.year_price" :min="0" :precision="2" :step="1" />
                <span class="unit">元</span>
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">VIP权益</el-divider>
          <el-form-item label="每日下载次数">
            <el-input-number v-model="vipConfig.daily_downloads" :min="1" :max="999" />
            <span class="unit">次/天</span>
          </el-form-item>
          <el-form-item label="邀请得VIP天数">
            <el-input-number v-model="vipConfig.invite_vip_days" :min="1" :max="365" />
            <span class="unit">天</span>
          </el-form-item>
          <el-divider content-position="left">微信虚拟支付</el-divider>
          <el-alert
            title="会员支付使用 wx.requestVirtualPayment，AppKey 仍以服务端环境变量为准，不会下发到小程序端。"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          />
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="AppID">
                <el-input v-model="vipConfig.virtual_pay_appid" placeholder="小程序 AppID" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="OfferId">
                <el-input v-model="vipConfig.virtual_pay_offer_id" placeholder="虚拟支付 OfferId" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="支付环境">
                <el-select v-model="vipConfig.virtual_pay_env" style="width: 180px">
                  <el-option label="现网" :value="0" />
                  <el-option label="沙箱" :value="1" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="支付模式">
                <el-select v-model="vipConfig.virtual_pay_mode" style="width: 220px">
                  <el-option label="代币充值" value="short_series_coin" />
                  <el-option label="道具直购" value="short_series_goods" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="16">
              <el-form-item label="回调URL">
                <el-input v-model="vipConfig.virtual_pay_notify_url" placeholder="https://api.example.com/vip/virtual-pay/notify" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="佣金配置" name="commission">
        <el-form :model="commissionConfig" label-width="160px">
          <el-divider content-position="left">佣金比例</el-divider>
          <el-alert
            title="佣金说明：一级下线 = 直接邀请的用户，二级下线 = 下线邀请的用户"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          />
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="一级佣金比例">
                <el-input-number v-model="commissionConfig.level1_rate" :min="0" :max="1" :precision="2" :step="0.01" />
                <span class="unit">(0-1)</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="二级佣金比例">
                <el-input-number v-model="commissionConfig.level2_rate" :min="0" :max="1" :precision="2" :step="0.01" />
                <span class="unit">(0-1)</span>
              </el-form-item>
            </el-col>
          </el-row>
          <el-divider content-position="left">视频价格</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="视频单价">
                <el-input-number v-model="commissionConfig.video_price" :min="0" :precision="2" :step="0.1" />
                <span class="unit">元/次</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="用户全价">
                <el-input-number v-model="commissionConfig.user_full_price" :min="0" :precision="2" :step="0.1" />
                <span class="unit">元/次</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="VIP价格">
                <el-input-number v-model="commissionConfig.vip_price" :min="0" :precision="2" :step="0.1" />
                <span class="unit">元/次</span>
              </el-form-item>
            </el-col>
          </el-row>
          <el-divider content-position="left">提现设置</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="最低提现金额">
                <el-input-number v-model="commissionConfig.min_withdraw" :min="0" :precision="2" :step="0.1" />
                <span class="unit">元</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="每日提现次数">
                <el-input-number v-model="commissionConfig.daily_withdraw_limit" :min="0" :max="999" />
                <span class="unit">次/天</span>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="提现管理" name="withdrawal">
        <el-form :model="withdrawalConfig" label-width="160px">
          <el-divider content-position="left">提现参数配置</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="最低提现金额">
                <el-input-number v-model="withdrawalConfig.min_amount" :min="0" :precision="2" :step="0.1" />
                <span class="unit">元</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="最大提现金额">
                <el-input-number v-model="withdrawalConfig.max_amount" :min="0" :precision="2" :step="1" />
                <span class="unit">元</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="每日提现次数">
                <el-input-number v-model="withdrawalConfig.daily_limit" :min="0" :max="999" />
                <span class="unit">次/天</span>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="提现手续费">
                <el-input-number v-model="withdrawalConfig.service_fee_rate" :min="0" :max="1" :precision="2" :step="0.01" />
                <span class="unit">(0-1)</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="提现功能">
                <el-switch v-model="withdrawalConfig.enabled" active-text="开启" inactive-text="关闭" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-divider content-position="left">微信提现配置</el-divider>
          <el-alert
            title="这些配置用于微信商户平台提现到用户零钱"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          />
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="商户号">
                <el-input v-model="withdrawalConfig.mch_id" placeholder="微信商户号" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="API密钥">
                <el-input v-model="withdrawalConfig.api_key" type="password" placeholder="商户API密钥" show-password />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="证书序列号">
            <el-input v-model="withdrawalConfig.cert_serial_no" placeholder="证书序列号" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="系统设置" name="system">
        <el-form :model="systemConfig" label-width="160px">
          <el-divider content-position="left">基础设置</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="客服微信号">
                <el-input v-model="systemConfig.service_wechat" placeholder="用于投诉页展示" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="是否维护模式">
                <el-switch v-model="systemConfig.maintenance_mode" active-text="是" inactive-text="否" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="公告内容">
            <el-input v-model="systemConfig.announcement" type="textarea" :rows="3" placeholder="首页跑马灯公告" />
          </el-form-item>
          <el-form-item label="分享文案">
            <el-input v-model="systemConfig.share_text" type="textarea" :rows="2" placeholder="微信分享文案" />
          </el-form-item>
          <el-divider content-position="left">资源解锁门槛</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="电影需要邀请">
                <el-input-number v-model="systemConfig.movie_invite_required" :min="0" />
                <span class="unit">人</span>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="4K需要邀请">
                <el-input-number v-model="systemConfig.fourk_invite_required" :min="0" />
                <span class="unit">人</span>
              </el-form-item>
            </el-col>
          </el-row>
          <el-divider content-position="left">文件上传</el-divider>
          <el-form-item label="首页背景图">
            <el-upload
              class="upload-area"
              :show-file-list="false"
              :before-upload="beforeUpload"
              :http-request="(options: any) => uploadImage(options, 'banner')"
            >
              <img v-if="systemConfig.home_bg_image" :src="systemConfig.home_bg_image" class="upload-preview" />
              <div v-else class="upload-placeholder">
                <el-icon :size="28"><Plus /></el-icon>
                <span>点击上传</span>
              </div>
            </el-upload>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <div class="save-bar">
      <el-button size="large" @click="handleReset">重置</el-button>
      <el-button type="primary" size="large" :loading="saving" @click="handleSaveAll">
        <el-icon><Check /></el-icon> 保存所有配置
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '@/store'
import axios from 'axios'

const adminStore = useAdminStore()

const activeTab = ref('vip')
const saving = ref(false)

const vipConfig = reactive({
  month_price: 29.9,
  quarter_price: 79.9,
  year_price: 299,
  daily_downloads: 10,
  invite_vip_days: 3,
  virtual_pay_appid: 'wx5b74bb5779e91393',
  virtual_pay_offer_id: '1450549318',
  virtual_pay_env: 0,
  virtual_pay_mode: 'short_series_coin',
  virtual_pay_notify_url: ''
})

const commissionConfig = reactive({
  level1_rate: 0.3,
  level2_rate: 0.1,
  video_price: 1.0,
  user_full_price: 2.0,
  vip_price: 0.5,
  min_withdraw: 1.0,
  daily_withdraw_limit: 3
})

const withdrawalConfig = reactive({
  min_amount: 1.0,
  max_amount: 5000,
  daily_limit: 3,
  service_fee_rate: 0.01,
  enabled: true,
  mch_id: '',
  api_key: '',
  cert_serial_no: ''
})

const systemConfig = reactive({
  service_wechat: '',
  maintenance_mode: false,
  announcement: '',
  share_text: '',
  home_bg_image: '',
  movie_invite_required: 3,
  fourk_invite_required: 5
})

const originalData = reactive({
  vip: { ...vipConfig },
  commission: { ...commissionConfig },
  withdrawal: { ...withdrawalConfig },
  system: { ...systemConfig }
})

onMounted(async () => {
  await loadAllConfigs()
})

const loadAllConfigs = async () => {
  try {
    const vip = await adminStore.getConfig('vip_settings')
    if (vip) {
      applyVipConfig(vip.config_data || vip)
      Object.assign(originalData.vip, vipConfig)
    }
  } catch (e) {}

  try {
    const commission = await adminStore.getConfig('commission')
    if (commission) {
      Object.assign(commissionConfig, commission.config_data || commission)
      Object.assign(originalData.commission, commissionConfig)
    }
  } catch (e) {}

  try {
    const withdrawal = await adminStore.getConfig('withdrawal')
    if (withdrawal) {
      Object.assign(withdrawalConfig, withdrawal.config_data || withdrawal)
      Object.assign(originalData.withdrawal, withdrawalConfig)
    }
  } catch (e) {}

  try {
    const system = await adminStore.getConfig('system')
    if (system) {
      Object.assign(systemConfig, system.config_data || system)
      Object.assign(originalData.system, systemConfig)
    }
  } catch (e) {}
}

const handleSaveAll = async () => {
  saving.value = true
  try {
    await adminStore.updateConfig({ type: 'vip_settings', config_data: buildVipSettings() })
    await adminStore.updateConfig({ type: 'commission', config_data: { ...commissionConfig } })
    await adminStore.updateConfig({ type: 'withdrawal', config_data: { ...withdrawalConfig } })
    await adminStore.updateConfig({ type: 'system', config_data: { ...systemConfig } })

    Object.assign(originalData.vip, vipConfig)
    Object.assign(originalData.commission, commissionConfig)
    Object.assign(originalData.withdrawal, withdrawalConfig)
    Object.assign(originalData.system, systemConfig)

    ElMessage.success('所有配置已保存')
  } catch (error: any) {
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const handleReset = () => {
  Object.assign(vipConfig, originalData.vip)
  Object.assign(commissionConfig, originalData.commission)
  Object.assign(withdrawalConfig, originalData.withdrawal)
  Object.assign(systemConfig, originalData.system)
  ElMessage.info('已重置为保存前的状态')
}

const applyVipConfig = (config: any) => {
  Object.assign(vipConfig, config)
  const packages = Array.isArray(config.packages) ? config.packages : []
  const month = packages.find((item: any) => item.id === 'month')
  const quarter = packages.find((item: any) => item.id === 'quarter')
  const year = packages.find((item: any) => item.id === 'year')
  if (month) vipConfig.month_price = Number(month.price || vipConfig.month_price)
  if (quarter) vipConfig.quarter_price = Number(quarter.price || vipConfig.quarter_price)
  if (year) vipConfig.year_price = Number(year.price || vipConfig.year_price)

  const virtualPay = config.virtual_pay || {}
  vipConfig.virtual_pay_appid = config.virtual_pay_appid || virtualPay.appid || vipConfig.virtual_pay_appid
  vipConfig.virtual_pay_offer_id = config.virtual_pay_offer_id || virtualPay.offer_id || vipConfig.virtual_pay_offer_id
  vipConfig.virtual_pay_env = Number(config.virtual_pay_env ?? virtualPay.env ?? vipConfig.virtual_pay_env)
  vipConfig.virtual_pay_mode = config.virtual_pay_mode || virtualPay.mode || vipConfig.virtual_pay_mode
  vipConfig.virtual_pay_notify_url = config.virtual_pay_notify_url || virtualPay.notify_url || vipConfig.virtual_pay_notify_url
}

const buildVipSettings = () => ({
  ...vipConfig,
  enabled: true,
  virtual_pay: {
    appid: vipConfig.virtual_pay_appid,
    offer_id: vipConfig.virtual_pay_offer_id,
    env: vipConfig.virtual_pay_env,
    mode: vipConfig.virtual_pay_mode,
    notify_url: vipConfig.virtual_pay_notify_url
  },
  packages: [
    {
      id: 'month',
      name: '月度会员',
      price: vipConfig.month_price,
      original_price: vipConfig.month_price,
      duration_days: 30,
      benefits: ['免广告', '专属客服', '高清画质']
    },
    {
      id: 'quarter',
      name: '季度会员',
      price: vipConfig.quarter_price,
      original_price: vipConfig.quarter_price,
      duration_days: 90,
      benefits: ['免广告', '专属客服', '高清画质', '优先处理']
    },
    {
      id: 'year',
      name: '年度会员',
      price: vipConfig.year_price,
      original_price: vipConfig.year_price,
      duration_days: 365,
      benefits: ['全部权益', '年度特惠', '专属客服', '专属标识']
    }
  ]
})

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过5MB')
    return false
  }
  return true
}

const uploadImage = async (options: any, folder: string) => {
  const file = options.file

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]

      try {
        const env = import.meta.env.DEV ? 'local' : 'prod'
        const uploadRes = await axios.post('/api/pc/call', {
          env,
          functionName: 'admin-upload',
          action: 'uploadImage',
          data: {
            fileName: `${folder}/${Date.now()}_${file.name}`,
            fileContent: base64
          }
        })

        if (uploadRes.data.url) {
          systemConfig.home_bg_image = uploadRes.data.url
          ElMessage.success('上传成功')
        } else {
          ElMessage.error('上传失败')
        }
      } catch (uploadErr: any) {
        console.error('上传失败:', uploadErr)
        ElMessage.error('上传失败: ' + (uploadErr.message || '未知错误'))
      }
    }
    reader.readAsDataURL(file)
  } catch (error: any) {
    ElMessage.error('上传失败')
  }
}
</script>

<style scoped>
.config-container {
  padding: 0;
}

.unit {
  margin-left: 8px;
  color: #999;
  font-size: 14px;
}

.save-bar {
  margin-top: 24px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  position: sticky;
  bottom: 20px;
}

.upload-area {
  width: 320px;
  height: 180px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: #409EFF;
}

.upload-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 14px;
  gap: 8px;
}
</style>
