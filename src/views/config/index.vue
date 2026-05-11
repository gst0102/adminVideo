<template>
  <div class="config-container">
    <el-tabs v-model="activeTab" type="border-card" v-loading="loadingConfig">
      <!-- VIP会员配置 -->
      <el-tab-pane label="VIP会员配置" name="vip">
        <el-form
          ref="vipFormRef"
          :model="vipConfig"
          label-width="160px"
          style="max-width: 1000px; margin-top: 30px;"
        >
          <el-form-item label="是否开启会员功能">
            <el-switch v-model="vipConfig.enabled" />
            <span class="form-tip">关闭后用户无法购买会员</span>
          </el-form-item>

          <el-divider content-position="left">会员套餐设置</el-divider>

          <div v-for="(pkg, index) in vipConfig.packages" :key="index" class="package-item">
            <el-card shadow="hover">
              <template #header>
                <div class="package-header">
                  <span class="package-title">
                    <el-icon><Ticket /></el-icon>
                    套餐 {{ index + 1 }}
                  </span>
                  <el-button
                    v-if="index > 0"
                    type="danger"
                    link
                    size="small"
                    @click="removePackage(index)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除此套餐
                  </el-button>
                </div>
              </template>

              <el-row :gutter="32">
                <el-col :span="8">
                  <el-form-item label="套餐名称" label-width="120px">
                    <el-input
                      v-model="pkg.name"
                      placeholder="如：月度会员、体验卡"
                      size="large"
                    />
                  </el-form-item>
                </el-col>

                <el-col :span="8">
                  <el-form-item label="价格（元）" label-width="110px">
                    <el-input-number
                      v-model="pkg.price"
                      :min="0"
                      :precision="2"
                      :step="1"
                      size="large"
                      controls-position="right"
                      style="width: 100%; min-width: 180px;"
                    />
                  </el-form-item>
                </el-col>

                <el-col :span="8">
                  <el-form-item label="时长（月）" label-width="100px">
                    <el-input-number
                      v-model="pkg.duration"
                      :min="0.1"
                      :step="1"
                      size="large"
                      controls-position="right"
                      style="width: 100%; min-width: 150px;"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="32">
                <el-col :span="10">
                  <el-form-item label="原价（元）" label-width="120px">
                    <el-input-number
                      v-model="pkg.originalPrice"
                      :min="0"
                      :precision="2"
                      size="large"
                      controls-position="right"
                      style="width: 100%; min-width: 180px;"
                    />
                    <div class="form-tip">用于显示折扣效果</div>
                  </el-form-item>
                </el-col>

                <el-col :span="14">
                  <el-form-item label="权益描述" label-width="120px">
                    <el-input
                      v-model="pkg.benefits"
                      type="textarea"
                      :rows="3"
                      placeholder="每行一个权益，如：&#10;免广告&#10;专属客服&#10;高清画质&#10;优先处理"
                      size="default"
                    />
                    <div class="form-tip">使用换行分隔多个权益</div>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-card>
          </div>

          <el-form-item style="margin-top: 20px;">
            <el-button type="primary" icon="Plus" size="large" @click="addPackage">
              添加新套餐
            </el-button>
          </el-form-item>

          <el-divider content-position="left">提现配置</el-divider>

          <el-row :gutter="32">
            <el-col :span="12">
              <el-form-item label="最低提现金额（元）">
                <el-input-number
                  v-model="withdrawalConfig.minWithdrawal"
                  :min="0.1"
                  :step="0.1"
                  :precision="2"
                  size="large"
                  controls-position="right"
                  style="width: 100%; min-width: 250px;"
                />
                <div class="form-tip">单次提现的最低金额限制</div>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="单次最大提现（元）">
                <el-input-number
                  v-model="withdrawalConfig.maxWithdrawal"
                  :min="1"
                  :step="10"
                  size="large"
                  controls-position="right"
                  style="width: 100%; min-width: 250px;"
                />
                <div class="form-tip">单次提现的最高金额限制</div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="提现说明文案">
            <el-input
              v-model="withdrawalConfig.withdrawalTips"
              type="textarea"
              :rows="4"
              placeholder="向用户展示的提现规则和说明...&#10;&#10;示例：&#10;1. 提现将在1-3个工作日内到账&#10;2. 单次提现最低0.1元&#10;3. 如有问题请联系客服"
              size="default"
            />
          </el-form-item>

          <el-form-item style="margin-top: 30px;">
            <el-button 
              type="primary" 
              :loading="saving" 
              size="large"
              icon="Check"
              @click="saveVipAndWithdrawalConfig"
            >
              {{ saving ? '保存中...' : '保存VIP和提现配置' }}
            </el-button>
            <el-button size="large" icon="Refresh" @click="loadConfigs" style="margin-left: 16px;">
              重新加载
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 客服配置 -->
      <el-tab-pane label="客服配置" name="service">
        <el-form
          ref="serviceFormRef"
          :model="serviceConfig"
          label-width="140px"
          style="max-width: 1000px; margin-top: 30px;"
        >
          <el-form-item label="自动回复开关">
            <el-switch v-model="serviceConfig.autoReply" active-text="开启" inactive-text="关闭" />
            <span class="form-tip">开启后新消息会自动回复预设内容</span>
          </el-form-item>

          <el-form-item label="欢迎语消息">
            <el-input
              v-model="serviceConfig.welcomeMsg"
              type="textarea"
              :rows="3"
              placeholder="用户首次进入聊天界面时发送的欢迎消息..."
              size="default"
            />
            <div class="form-tip">当用户打开聊天窗口时自动发送</div>
          </el-form-item>

          <el-form-item label="离线/忙碌回复">
            <el-input
              v-model="serviceConfig.offlineMsg"
              type="textarea"
              :rows="3"
              placeholder="非工作时间或客服不在线时的自动回复..."
              size="default"
            />
            <div class="form-tip">客服长时间未回复时自动发送</div>
          </el-form-item>

          <el-form-item label="快捷回复列表">
            <div class="quick-replies-wrapper">
              <div class="quick-replies-list">
                <div v-for="(reply, index) in serviceConfig.quickReplies" :key="index" class="reply-item">
                  <el-input 
                    v-model="serviceConfig.quickReplies[index]" 
                    placeholder="输入快捷回复内容..."
                    size="default"
                    clearable
                  >
                    <template #append>
                      <el-button 
                        icon="Delete" 
                        @click="removeReply(index)"
                        type="danger"
                        circle
                      />
                    </template>
                  </el-input>
                </div>
                
                <div v-if="serviceConfig.quickReplies.length === 0" class="empty-quick-replies">
                  <el-empty description="暂无快捷回复" :image-size="60" />
                </div>
              </div>

              <el-button 
                type="primary" 
                plain 
                icon="Plus" 
                size="default"
                @click="addReply"
                style="margin-top: 12px;"
              >
                添加快捷回复
              </el-button>
            </div>
          </el-form-item>

          <el-form-item style="margin-top: 30px;">
            <el-button 
              type="primary" 
              :loading="savingService" 
              size="large"
              icon="Check"
              @click="saveServiceConfig"
            >
              {{ savingService ? '保存中...' : '保存客服配置' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 佣金配置 -->
      <el-tab-pane label="佣金配置" name="commission">
        <el-form
          ref="commissionFormRef"
          :model="commissionConfig"
          label-width="180px"
          style="max-width: 1000px; margin-top: 30px;"
        >
          <el-alert
            title="佣金配置说明"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 24px;"
          >
            <template #default>
              <div style="line-height: 1.8; font-size: 14px;">
                <p><strong>佣金计算规则：</strong></p>
                <p>当用户B通过邀请码注册并购买VIP会员时：</p>
                <ul style="margin-left: 20px; margin-top: 8px;">
                  <li><strong>一级邀请人（A）</strong>获得：订单金额 × 一级代理佣金比例</li>
                  <li><strong>二级邀请人（C，A的上级）</strong>获得：订单金额 × 二级代理佣金比例</li>
                </ul>
                <p style="margin-top: 8px;"><strong>示例：</strong>B购买100元VIP → A得{{ (commissionConfig.level1Rate || 10).toFixed(1) }}元，C得{{ (commissionConfig.level2Rate || 5).toFixed(1) }}元</p>
              </div>
            </template>
          </el-alert>

          <el-divider content-position="left">代理佣金比例设置</el-divider>

          <el-row :gutter="32">
            <el-col :span="12">
              <el-form-item label="一级代理佣金比例（%）" prop="level1Rate">
                <el-input-number
                  v-model="commissionConfig.level1Rate"
                  :min="0"
                  :max="50"
                  :step="0.1"
                  :precision="1"
                  size="large"
                  controls-position="right"
                  style="width: 100%; min-width: 250px;"
                />
                <div class="form-tip">直接邀请人获得的佣金比例，建议设置范围：5%-30%</div>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="二级代理佣金比例（%）" prop="level2Rate">
                <el-input-number
                  v-model="commissionConfig.level2Rate"
                  :min="0"
                  :max="25"
                  :step="0.1"
                  :precision="1"
                  size="large"
                  controls-position="right"
                  style="width: 100%; min-width: 250px;"
                />
                <div class="form-tip">间接邀请人（上上级）获得的佣金比例，建议设置范围：2%-15%</div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="32">
            <el-col :span="12">
              <el-form-item label="最低结算金额（元）" prop="minCommissionAmount">
                <el-input-number
                  v-model="commissionConfig.minCommissionAmount"
                  :min="0.01"
                  :step="1"
                  :precision="2"
                  size="large"
                  controls-position="right"
                  style="width: 100%; min-width: 250px;"
                />
                <div class="form-tip">单笔佣金的最低结算金额</div>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="佣金结算周期（天）" prop="settlementCycle">
                <el-input-number
                  v-model="commissionConfig.settlementCycle"
                  :min="0"
                  :max="30"
                  :step="1"
                  size="large"
                  controls-position="right"
                  style="width: 100%; min-width: 200px;"
                />
                <div class="form-tip">0表示即时结算，其他值表示延迟结算天数</div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="佣金规则说明">
            <el-input
              v-model="commissionConfig.commissionRules"
              type="textarea"
              :rows="4"
              placeholder="向用户展示的佣金规则说明...&#10;&#10;示例：&#10;1. 邀请好友购买VIP即可获得佣金&#10;2. 佣金将在订单完成后自动到账&#10;3. 二级代理可获得额外奖励"
              size="default"
            />
            <div class="form-tip">显示在小程序收益中心页面</div>
          </el-form-item>

          <el-form-item style="margin-top: 30px;">
            <el-button
              type="primary"
              :loading="savingCommission"
              size="large"
              icon="Check"
              @click="saveCommissionConfig"
            >
              {{ savingCommission ? '保存中...' : '保存佣金配置' }}
            </el-button>
            <el-button size="large" icon="Refresh" @click="loadCommissionConfigFromDB" style="margin-left: 16px;">
              重新加载
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- Banner广告配置 -->
      <el-tab-pane label="Banner广告" name="banner">
        <div style="max-width: 1200px; margin-top: 30px;">
          <!-- 基本设置 -->
          <el-card shadow="hover" style="margin-bottom: 24px;">
            <template #header>
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-icon><Setting /></el-icon>
                <span style="font-size: 16px; font-weight: bold;">基本设置</span>
              </div>
            </template>

            <el-form :model="bannerConfig" label-width="160px">
              <el-row :gutter="32">
                <el-col :span="8">
                  <el-form-item label="启用Banner广告">
                    <el-switch v-model="bannerConfig.enabled" />
                    <div class="form-tip">关闭后首页不显示轮播图</div>
                  </el-form-item>
                </el-col>

                <el-col :span="8">
                  <el-form-item label="自动播放">
                    <el-switch v-model="bannerConfig.autoplay" />
                    <div class="form-tip">是否自动切换广告</div>
                  </el-form-item>
                </el-col>

                <el-col :span="8">
                  <el-form-item label="切换间隔（秒）">
                    <el-input-number
                      v-model="bannerConfig.interval"
                      :min="2"
                      :max="10"
                      :step="1"
                      size="large"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </el-card>

          <!-- 广告列表 -->
          <el-card shadow="hover" style="margin-bottom: 24px;">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <el-icon><Picture /></el-icon>
                  <span style="font-size: 16px; font-weight: bold;">广告列表</span>
                </div>
                <el-button type="primary" icon="Plus" @click="addBannerItem">添加广告</el-button>
              </div>
            </template>

            <div v-if="bannerConfig.banners.length === 0" style="text-align: center; padding: 60rpx 0;">
              <el-empty description="暂无广告，点击上方按钮添加" />
            </div>

            <div v-else>
              <el-table :data="bannerConfig.banners" border stripe style="width: 100%;">
                <el-table-column prop="sort" label="排序" width="80" align="center">
                  <template #default="{ $index }">
                    {{ $index + 1 }}
                  </template>
                </el-table-column>

                <el-table-column prop="title" label="标题" width="150">
                  <template #default="{ row }">
                    <el-input v-model="row.title" placeholder="广告标题" size="default" />
                  </template>
                </el-table-column>

                <el-table-column label="图片" width="280">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 12px; align-items: center;">
                      <el-image
                        v-if="row.imageUrl"
                        :src="row._tempFileURL || row.imageUrl"
                        fit="cover"
                        style="width: 100px; height: 56px; border-radius: 6px;"
                        :preview-src-list="[row._tempFileURL || row.imageUrl]"
                      />
                      <el-input
                        v-model="row.imageUrl"
                        placeholder="图片URL或fileID地址"
                        size="default"
                        clearable
                      >
                        <template #append>
                          <el-button
                            icon="Upload"
                            :loading="uploadingImage && currentUploadRow === row"
                            @click="handleUploadImage(row)"
                          >
                            {{ uploadingImage && currentUploadRow === row ? '上传中...' : '上传' }}
                          </el-button>
                        </template>
                      </el-input>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="跳转类型" width="120">
                  <template #default="{ row }">
                    <el-select v-model="row.linkType" size="default" style="width: 100%;">
                      <el-option label="小程序页面" value="miniapp" />
                      <el-option label="网页链接" value="webview" />
                      <el-option label="复制链接" value="copy" />
                      <el-option label="无跳转" value="none" />
                    </el-select>
                  </template>
                </el-table-column>

                <el-table-column label="跳转地址" min-width="200">
                  <template #default="{ row }">
                    <el-input
                      v-model="row.linkUrl"
                      :placeholder="getLinkPlaceholder(row.linkType)"
                      size="default"
                      clearable
                    />
                  </template>
                </el-table-column>

                <el-table-column label="状态" width="90" align="center">
                  <template #default="{ row }">
                    <el-switch v-model="row.enabled" active-text="启用" inactive-text="禁用" />
                  </template>
                </el-table-column>

                <el-table-column label="操作" width="100" align="center">
                  <template #default="{ $index }">
                    <el-button type="danger" link icon="Delete" @click="removeBannerItem($index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-card>

          <!-- 保存按钮 -->
          <div style="text-align: center; margin-top: 30px;">
            <el-button
              type="primary"
              :loading="savingBanner"
              size="large"
              icon="Check"
              @click="saveBannerConfig"
              style="padding: 14px 50px; font-size: 16px;"
            >
              {{ savingBanner ? '保存中...' : '保存Banner配置' }}
            </el-button>
            <el-button size="large" icon="Refresh" @click="loadBannerConfigFromDB" style="margin-left: 16px;">
              重新加载
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 其他配置 -->
      <el-tab-pane label="平台信息" name="other">
        <el-form label-width="140px" style="max-width: 1000px; margin-top: 30px;">
          
          <el-form-item label="平台名称">
            <el-input 
              v-model="platformConfig.platformName" 
              placeholder="请输入平台名称"
              size="large"
              style="max-width: 400px;"
              clearable
            />
            <div class="form-tip">显示在小程序标题栏和分享卡片中</div>
          </el-form-item>

          <el-form-item label="平台Logo">
            <div class="logo-upload">
              <el-upload
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                list-type="picture"
              >
                <el-button type="primary" icon="Upload" size="large">
                  上传Logo图片
                </el-button>
                <template #tip>
                  <div class="upload-tip">支持 JPG、PNG 格式，建议尺寸 200x200 像素</div>
                </template>
              </el-upload>
              
              <div v-if="platformConfig.logoUrl" class="logo-preview">
                <el-image 
                  :src="platformConfig.logoUrl" 
                  fit="cover"
                  style="width: 80px; height: 80px; border-radius: 8px;"
                />
                <el-button 
                  type="danger" 
                  link 
                  size="small"
                  @click="platformConfig.logoUrl = ''"
                  style="margin-left: 12px;"
                >
                  删除
                </el-button>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="客服联系方式">
            <el-input 
              v-model="platformConfig.contactInfo" 
              placeholder="微信号 / 手机号 / 企业微信等"
              size="large"
              style="max-width: 500px;"
              clearable
            />
            <div class="form-tip">显示在关于我们页面和帮助中心</div>
          </el-form-item>

          <el-divider />

          <el-form-item label="分享标题">
            <el-input 
              v-model="platformConfig.shareTitle" 
              placeholder="分享时显示的标题"
              size="default"
              style="max-width: 500px;"
              maxlength="30"
              show-word-limit
              clearable
            />
          </el-form-item>

          <el-form-item label="分享描述">
            <el-input 
              v-model="platformConfig.shareDesc" 
              type="textarea"
              :rows="2"
              placeholder="分享时显示的描述文字"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>

          <el-form-item style="margin-top: 40px;">
            <el-button 
              type="primary" 
              :loading="savingOther" 
              size="large"
              icon="Check"
              @click="saveOtherConfig"
            >
              {{ savingOther ? '保存中...' : '保存平台配置' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <!-- 隐藏的文件上传输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none;"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useAdminStore } from '@/store'
import { callFunction as tcbCallFunction } from '@/utils/cloudbase'

const adminStore = useAdminStore()
const activeTab = ref('vip')
const loadingConfig = ref(false)
const saving = ref(false)
const savingService = ref(false)
const savingOther = ref(false)

const vipFormRef = ref<FormInstance>()
const serviceFormRef = ref<FormInstance>()
const commissionFormRef = ref<FormInstance>()

// 从数据库加载的真实数据
const vipConfig = reactive({
  enabled: true,
  packages: [] as any[],
})

const withdrawalConfig = reactive({
  minWithdrawal: 0.1,
  maxWithdrawal: 200,
  withdrawalTips: ''
})

const serviceConfig = reactive({
  autoReply: false,
  welcomeMsg: '',
  offlineMsg: '',
  quickReplies: [] as string[]
})

const platformConfig = reactive({
  platformName: '',
  contactInfo: '',
  logoUrl: '',
  shareTitle: '',
  shareDesc: ''
})

const commissionConfig = reactive({
  level1Rate: 10.0,
  level2Rate: 5.0,
  minCommissionAmount: 0.01,
  settlementCycle: 0,
  commissionRules: '1. 邀请好友购买VIP即可获得佣金\n2. 佣金将在订单完成后自动到账\n3. 二级代理可获得额外奖励'
})

const savingCommission = ref(false)

const bannerConfig = reactive({
  enabled: true,
  autoplay: true,
  interval: 3,
  banners: [] as any[]
})

const savingBanner = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)
const currentUploadRow = ref<any>(null)  // 当前正在上传的banner项
const uploadingImage = ref(false)

onMounted(() => {
  loadConfigs()
})

// 加载所有配置（从数据库）
const loadConfigs = async () => {
  loadingConfig.value = true
  
  try {
    console.log('[Config] 开始从数据库加载配置...')
    
    // 加载VIP配置
    const vipData = await adminStore.getConfig('vip_settings')
    if (vipData && vipData._id) {
      console.log('[Config] 找到VIP配置:', vipData._id)
      vipConfig.enabled = vipData.enabled ?? true
      vipConfig.packages = vipData.packages || []
      
      if (vipConfig.packages.length === 0) {
        console.log('[Config] VIP配置为空，添加默认套餐')
        addPackage()
        addPackage()
        addPackage()
      }
    } else {
      console.log('[Config] 数据库中无VIP配置，使用默认值')
      addPackage()
      addPackage()
      addPackage()
    }

    // 加载提现配置
    const withdrawalData = await adminStore.getConfig('withdrawal_config')
    if (withdrawalData && withdrawalData._id) {
      console.log('[Config] 找到提现配置:', withdrawalData._id)
      withdrawalConfig.minWithdrawal = withdrawalData.minWithdrawal ?? 0.1
      withdrawalConfig.maxWithdrawal = withdrawalData.maxWithdrawal ?? 200
      withdrawalConfig.withdrawalTips = withdrawalData.withdrawalTips || '1. 提现将在1-3个工作日内到账\n2. 单次提现最低0.1元\n3. 如有问题请联系客服'
    } else {
      console.log('[Config] 数据库中无提现配置，使用默认值')
      withdrawalConfig.withdrawalTips = '1. 提现将在1-3个工作日内到账\n2. 单次提现最低0.1元\n3. 如有问题请联系客服'
    }

    // 加载客服配置
    const serviceData = await adminStore.getConfig('service_settings')
    if (serviceData && serviceData._id) {
      console.log('[Config] 找到客服配置:', serviceData._id)
      serviceConfig.autoReply = serviceData.autoReply || false
      serviceConfig.welcomeMsg = serviceData.welcomeMsg || '您好！我是客服小助手，有什么可以帮助您的吗？'
      serviceConfig.offlineMsg = serviceData.offlineMsg || '抱歉，客服暂时不在线，请留言，我们会尽快回复您。'
      serviceConfig.quickReplies = serviceData.quickReplies?.length > 0 
        ? serviceData.quickReplies 
        : [
            '您好，请问有什么可以帮您的？',
            '关于会员问题，您可以查看会员权益说明。',
            '提现问题一般1-3个工作日到账，如有异常请联系我们。',
            '感谢您的反馈，我们会尽快处理！'
          ]
    } else {
      console.log('[Config] 数据库中无客服配置，使用默认值')
      serviceConfig.quickReplies = [
        '您好，请问有什么可以帮您的？',
        '关于会员问题，您可以查看会员权益说明。',
        '提现问题一般1-3个工作日到账，如有异常请联系我们。',
        '感谢您的反馈，我们会尽快处理！'
      ]
    }

    // 加载平台配置
    const platformData = await adminStore.getConfig('platform_settings')
    if (platformData && platformData._id) {
      console.log('[Config] 找到平台配置:', platformData._id)
      platformConfig.platformName = platformData.platformName || '视频平台'
      platformConfig.contactInfo = platformData.contactInfo || ''
      platformConfig.logoUrl = platformData.logoUrl || ''
      platformConfig.shareTitle = platformData.shareTitle || ''
      platformConfig.shareDesc = platformData.shareDesc || ''
    } else {
      console.log('[Config] 数据库中无平台配置，使用默认值')
      platformConfig.platformName = '视频平台'
    }

    // 加载佣金配置
    await loadCommissionConfigFromDB()

    // 加载Banner广告配置
    await loadBannerConfigFromDB()

    ElMessage.success('配置加载成功')
    
  } catch (error) {
    console.error('[Config] 加载配置失败:', error)
    ElMessage.error('加载配置失败: ' + (error as Error).message)
    
    // 使用默认值作为后备
    vipConfig.enabled = true
    vipConfig.packages = []
    addPackage()
    addPackage()
    addPackage()
    
    withdrawalConfig.minWithdrawal = 0.1
    withdrawalConfig.maxWithdrawal = 200
    withdrawalConfig.withdrawalTips = '1. 提现将在1-3个工作日内到账\n2. 单次提现最低0.1元\n3. 如有问题请联系客服'
    
    serviceConfig.autoReply = false
    serviceConfig.welcomeMsg = '您好！我是客服小助手，有什么可以帮助您的吗？'
    serviceConfig.offlineMsg = '抱歉，客服暂时不在线，请留言，我们会尽快回复您。'
    serviceConfig.quickReplies = [
      '您好，请问有什么可以帮您的？',
      '关于会员问题，您可以查看会员权益说明。',
      '提现问题一般1-3个工作日到账，如有异常请联系我们。',
      '感谢您的反馈，我们会尽快处理！'
    ]
    
    platformConfig.platformName = '视频平台'
  } finally {
    loadingConfig.value = false
  }
}

// VIP配置方法
const addPackage = () => {
  const index = vipConfig.packages.length + 1
  let defaultPrice = 9.9
  let defaultDuration = 1
  let defaultOriginalPrice = 19.9
  let defaultBenefits = '免广告\n专属客服\n高清画质'
  
  if (index === 2) {
    defaultPrice = 26.9
    defaultDuration = 3
    defaultOriginalPrice = 59.7
    defaultBenefits = '免广告\n专属客服\n高清画质\n优先处理'
  } else if (index === 3) {
    defaultPrice = 88.8
    defaultDuration = 12
    defaultOriginalPrice = 238.8
    defaultBenefits = '全部权益\n年度特惠\n专属客服7×24\n生日特权'
  }
  
  vipConfig.packages.push({
    name: `套餐${index}`,
    price: defaultPrice,
    duration: defaultDuration,
    originalPrice: defaultOriginalPrice,
    benefits: defaultBenefits,
    period: index === 1 ? 'month' : index === 2 ? 'quarter' : 'year'
  })
}

const removePackage = async (index: number) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${vipConfig.packages[index].name}」这个套餐吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    vipConfig.packages.splice(index, 1)
    ElMessage.success('已删除套餐，正在同步到服务器...')
    await saveVipAndWithdrawalConfig()
  } catch {
    // 用户取消删除
  }
}

const saveVipAndWithdrawalConfig = async () => {
  saving.value = true

  try {
    console.log('[Config] ========== 开始保存VIP和提现配置 ==========')
    console.log('[Config] VIP配置原始数据:', JSON.stringify(vipConfig, null, 2))
    console.log('[Config] 提现配置原始数据:', JSON.stringify(withdrawalConfig, null, 2))

    // 验证数据完整性
    if (!vipConfig.enabled) {
      throw new Error('请确认是否开启会员功能')
    }

    if (vipConfig.packages.length === 0) {
      throw new Error('至少需要保留一个套餐')
    }

    // 详细验证每个套餐
    for (let i = 0; i < vipConfig.packages.length; i++) {
      const pkg = vipConfig.packages[i]
      console.log(`[Config] 验证第${i+1}个套餐:`, JSON.stringify(pkg))

      if (!pkg.name || !pkg.name.trim()) {
        throw new Error(`第${i+1}个套餐名称不能为空`)
      }
      if (pkg.price === undefined || pkg.price === null || isNaN(pkg.price)) {
        throw new Error(`第${i+1}个套餐价格无效`)
      }
      if (pkg.price <= 0) {
        throw new Error(`第${i+1}个套餐价格必须大于0，当前值: ${pkg.price}`)
      }
      if (pkg.duration === undefined || pkg.duration === null || isNaN(pkg.duration)) {
        throw new Error(`第${i+1}个套餐时长无效`)
      }
      if (pkg.duration <= 0) {
        throw new Error(`第${i+1}个套餐时长必须大于0，当前值: ${pkg.duration}`)
      }
    }

    // 验证提现配置
    if (withdrawalConfig.minWithdrawal >= withdrawalConfig.maxWithdrawal) {
      throw new Error(`最低提现金额(${withdrawalConfig.minWithdrawal})不能大于等于最大提现金额(${withdrawalConfig.maxWithdrawal})`)
    }

    console.log('[Config] ✅ 数据验证通过，开始写入数据库...')

    // 保存VIP配置到数据库
    console.log('[Config] >>> 步骤1: 写入VIP配置到 manger-data 表...')
    const vipPayload = {
      type: 'vip_settings',
      enabled: vipConfig.enabled,
      packages: vipConfig.packages.map(pkg => ({
        name: pkg.name?.trim() || '',
        price: parseFloat(pkg.price),
        duration: parseFloat(pkg.duration),
        originalPrice: parseFloat(pkg.originalPrice || 0),
        benefits: pkg.benefits || '',
        period: pkg.period || 'month'
      }))
    }
    console.log('[Config] VIP写入载荷:', JSON.stringify(vipPayload, null, 2))

    const vipResult = await adminStore.updateConfig(vipPayload)
    console.log('[Config] ✅ VIP配置写入成功:', vipResult)

    // 保存提现配置到数据库
    console.log('[Config] >>> 步骤2: 写入提现配置到 manger-data 表...')
    const withdrawalPayload = {
      type: 'withdrawal_config',
      minWithdrawal: withdrawalConfig.minWithdrawal,
      maxWithdrawal: withdrawalConfig.maxWithdrawal,
      withdrawalTips: withdrawalConfig.withdrawalTips?.trim() || ''
    }
    console.log('[Config] 提现写入载荷:', JSON.stringify(withdrawalPayload, null, 2))

    const withdrawalResult = await adminStore.updateConfig(withdrawalPayload)
    console.log('[Config] ✅ 提现配置写入成功:', withdrawalResult)

    ElMessage.success('✅ VIP和提现配置已成功保存到数据库！')
    console.log('[Config] ========== ✅ 所有配置保存完成 ==========')

  } catch (error: any) {
    console.error('[Config] ❌ 保存失败详情:')
    console.error('- 错误对象:', error)
    console.error('- 错误消息:', error.message)
    console.error('- 错误堆栈:', error.stack)

    ElMessage.error('❌ 保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 客服配置方法
const addReply = () => {
  serviceConfig.quickReplies.push('')
}

const removeReply = (index: number) => {
  serviceConfig.quickReplies.splice(index, 1)
}

const saveServiceConfig = async () => {
  savingService.value = true
  
  try {
    console.log('[Config] 开始保存客服配置...')
    console.log('[Config] 客服配置:', JSON.stringify(serviceConfig))

    // 验证
    if (serviceConfig.quickReplies.some(r => !r.trim())) {
      const emptyIndex = serviceConfig.quickReplies.findIndex(r => !r.trim())
      throw new Error(`第${emptyIndex+1}条快捷回复内容为空`)
    }

    // 写入数据库
    console.log('[Config] 正在写入客服配置到 manger-data 表...')
    const result = await adminStore.updateConfig({
      type: 'service_settings',
      autoReply: serviceConfig.autoReply,
      welcomeMsg: serviceConfig.welcomeMsg || '您好！我是客服小助手，有什么可以帮助您的吗？',
      offlineMsg: serviceConfig.offlineMsg || '抱歉，客服暂时不在线，请留言，我们会尽快回复您。',
      quickReplies: serviceConfig.quickReplies.filter(r => r.trim())
    })
    
    console.log('[Config] 客服配置写入结果:', result)
    ElMessage.success('✅ 客服配置已成功保存到数据库！')
    
  } catch (error: any) {
    console.error('[Config] ❌ 保存客服配置失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    savingService.value = false
  }
}

// 其他配置方法
const saveOtherConfig = async () => {
  savingOther.value = true

  try {
    console.log('[Config] 开始保存平台配置...')
    console.log('[Config] 平台配置:', JSON.stringify(platformConfig))

    // 写入数据库
    console.log('[Config] 正在写入平台配置到 manger-data 表...')
    const result = await adminStore.updateConfig({
      type: 'platform_settings',
      platformName: platformConfig.platformName || '视频平台',
      contactInfo: platformConfig.contactInfo || '',
      logoUrl: platformConfig.logoUrl || '',
      shareTitle: platformConfig.shareTitle || '',
      shareDesc: platformConfig.shareDesc || ''
    })

    console.log('[Config] 平台配置写入结果:', result)
    ElMessage.success('✅ 平台配置已成功保存到数据库！')

  } catch (error: any) {
    console.error('[Config] ❌ 保存平台配置失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    savingOther.value = false
  }
}

// 佣金配置方法
const loadCommissionConfigFromDB = async () => {
  try {
    console.log('[Config] 开始加载佣金配置...')

    const commissionData = await adminStore.getConfig('commission_settings')
    if (commissionData && commissionData._id) {
      console.log('[Config] 找到佣金配置:', commissionData._id)
      commissionConfig.level1Rate = commissionData.level1Rate ?? 10.0
      commissionConfig.level2Rate = commissionData.level2Rate ?? 5.0
      commissionConfig.minCommissionAmount = commissionData.minCommissionAmount ?? 0.01
      commissionConfig.settlementCycle = commissionData.settlementCycle ?? 0
      commissionConfig.commissionRules = commissionData.commissionRules || '1. 邀请好友购买VIP即可获得佣金\n2. 佣金将在订单完成后自动到账\n3. 二级代理可获得额外奖励'
    } else {
      console.log('[Config] 数据库中无佣金配置，使用默认值')
    }

  } catch (error: any) {
    console.error('[Config] 加载佣金配置失败:', error)
    ElMessage.warning('加载佣金配置失败，使用默认值')
  }
}

const saveCommissionConfig = async () => {
  savingCommission.value = true

  try {
    console.log('[Config] ========== 开始保存佣金配置 ==========')
    console.log('[Config] 佣金配置原始数据:', JSON.stringify(commissionConfig, null, 2))

    // 验证数据
    if (commissionConfig.level1Rate <= 0) {
      throw new Error('一级代理佣金比例必须大于0')
    }

    if (commissionConfig.level2Rate < 0) {
      throw new Error('二级代理佣金比例不能为负数')
    }

    if (commissionConfig.level1Rate + commissionConfig.level2Rate > 60) {
      throw new Error(`一级和二级佣金比例之和不能超过60%，当前总和：${(commissionConfig.level1Rate + commissionConfig.level2Rate).toFixed(1)}%`)
    }

    if (commissionConfig.level2Rate >= commissionConfig.level1Rate) {
      throw new Error('二级代理佣金比例应小于一级代理佣金比例')
    }

    console.log('[Config] ✅ 佣金配置验证通过，开始写入数据库...')

    // 写入数据库
    const commissionPayload = {
      type: 'commission_settings',
      level1Rate: commissionConfig.level1Rate,
      level2Rate: commissionConfig.level2Rate,
      minCommissionAmount: commissionConfig.minCommissionAmount,
      settlementCycle: commissionConfig.settlementCycle,
      commissionRules: commissionConfig.commissionRules?.trim() || ''
    }
    console.log('[Config] 佣金写入载荷:', JSON.stringify(commissionPayload, null, 2))

    const result = await adminStore.updateConfig(commissionPayload)
    console.log('[Config] ✅ 佣金配置写入成功:', result)

    ElMessage.success('✅ 佣金配置已成功保存到数据库！')
    console.log('[Config] ========== ✅ 佣金配置保存完成 ==========')

  } catch (error: any) {
    console.error('[Config] ❌ 保存佣金配置失败:', error)
    ElMessage.error('❌ 保存失败: ' + error.message)
  } finally {
    savingCommission.value = false
  }
}

// Banner广告配置方法
const loadBannerConfigFromDB = async () => {
  try {
    console.log('[Config] 开始加载Banner配置...')

    const bannerData = await adminStore.getConfig('banner_settings')
    if (bannerData && bannerData._id) {
      console.log('[Config] 找到Banner配置:', bannerData._id)
      bannerConfig.enabled = bannerData.enabled ?? true
      bannerConfig.autoplay = bannerData.autoplay ?? true
      bannerConfig.interval = bannerData.interval ?? 3
      bannerConfig.banners = bannerData.banners || []
    } else {
      console.log('[Config] 数据库中无Banner配置，使用默认值')
    }

  } catch (error: any) {
    console.error('[Config] 加载Banner配置失败:', error)
    ElMessage.warning('加载Banner配置失败，使用默认值')
  }
}

const addBannerItem = () => {
  bannerConfig.banners.push({
    title: '',
    imageUrl: '',
    linkUrl: '',
    linkType: 'none',
    enabled: true,
    sort: bannerConfig.banners.length + 1
  })
}

const removeBannerItem = (index: number) => {
  ElMessageBox.confirm(
    `确定要删除第 ${index + 1} 条广告吗？`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    bannerConfig.banners.splice(index, 1)
    ElMessage.success('已删除，正在同步到服务器...')
    await saveBannerConfig()
  }).catch(() => {})
}

const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

const handleUploadImage = (row: any) => {
  console.log('[Banner] 开始选择图片...', row)
  currentUploadRow.value = row

  // 触发隐藏的文件输入框
  if (fileInputRef.value) {
    fileInputRef.value.click()
  } else {
    ElMessage.error('文件选择器未初始化')
  }
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    console.log('[Banner] 未选择文件')
    return
  }

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件（支持 JPG、PNG、GIF、WebP）')
    return
  }

  // 验证文件大小（最大5MB）
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }

  uploadingImage.value = true
  console.log('[Banner] 已选择文件:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`)

  try {
    let base64Data: string

    if (file.size > 100 * 1024) {
      console.log('[Banner] 图片较大，正在压缩...')
      base64Data = await compressImage(file, 800, 0.7)
      console.log('[Banner] 压缩完成，base64长度:', base64Data.length)
    } else {
      const reader = new FileReader()
      base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('文件读取失败'))
        reader.readAsDataURL(file)
      })
    }

    console.log('[Banner] 文件已转换为 base64，长度:', base64Data.length)

    // 通过 cloudbase.callFunction 上传（无请求体大小限制）
    const result = await tcbCallFunction('admin-upload', {
      action: 'uploadImage',
      data: {
        base64Data: base64Data,
        fileName: file.name,
        folder: 'banner'
      }
    })

    if (result.code === 200 && result.data?.success) {
      console.log('[Banner] ✅ 上传成功:', result.data)

      // 更新当前行的 imageUrl（保存fileID，小程序端动态获取临时链接）
      if (currentUploadRow.value) {
        currentUploadRow.value.imageUrl = result.data.fileID
        currentUploadRow.value._tempFileURL = result.data.tempFileURL
      }

      ElMessage.success(`✅ 图片上传成功！已保存到云存储 banner/ 目录`)
      
    } else {
      throw new Error(result.msg || '上传失败')
    }

  } catch (error: any) {
    console.error('[Banner] ❌ 上传失败:', error)
    ElMessage.error(`❌ 上传失败: ${error.message}`)
  } finally {
    uploadingImage.value = false
    currentUploadRow.value = null
    
    // 清空 input 的值，允许重复选择同一文件
    input.value = ''
  }
}

const getLinkPlaceholder = (linkType: string) => {
  switch (linkType) {
    case 'miniapp': return '/pages/xxx/xxx'
    case 'webview': return 'https://example.com'
    case 'copy': return 'https://example.com'
    default: return '留空表示不跳转'
  }
}

const saveBannerConfig = async () => {
  savingBanner.value = true

  try {
    console.log('[Config] ========== 开始保存Banner配置 ==========')

    // 验证数据
    if (!bannerConfig.banners.length && bannerConfig.enabled) {
      throw new Error('启用Banner时至少需要添加一条广告')
    }

    for (let i = 0; i < bannerConfig.banners.length; i++) {
      const item = bannerConfig.banners[i]
      if (!item.imageUrl) {
        throw new Error(`第${i+1}条广告的图片URL不能为空`)
      }
      if (item.linkType !== 'none' && !item.linkUrl) {
        throw new Error(`第${i+1}条广告的跳转地址不能为空`)
      }
    }

    console.log('[Config] ✅ Banner配置验证通过')

    // 写入数据库
    const bannerPayload = {
      type: 'banner_settings',
      enabled: bannerConfig.enabled,
      autoplay: bannerConfig.autoplay,
      interval: bannerConfig.interval,
      banners: bannerConfig.banners.map((item, index) => ({
        ...item,
        sort: index + 1,
        id: item.id || `banner_${Date.now()}_${index}`
      }))
    }
    console.log('[Config] Banner写入载荷:', JSON.stringify(bannerPayload, null, 2))

    const result = await adminStore.updateConfig(bannerPayload)
    console.log('[Config] ✅ Banner配置写入成功:', result)

    ElMessage.success('✅ Banner广告配置已成功保存到数据库！')
    console.log('[Config] ========== ✅ Banner配置保存完成 ==========')

  } catch (error: any) {
    console.error('[Config] ❌ 保存Banner配置失败:', error)
    ElMessage.error('❌ 保存失败: ' + error.message)
  } finally {
    savingBanner.value = false
  }
}
</script>

<style scoped>
.config-container {
  padding: 24px;
  background: #fff;
  min-height: calc(100vh - 120px);
}

/* ========== 表单整体优化 ========== */
:deep(.el-form-item) {
  margin-bottom: 24px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
  padding-right: 12px;
}

/* ========== 输入框优化 ========== */
:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  font-size: 15px;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__inner) {
  text-align: left;
  padding-left: 12px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* ========== 包裹头部 ========== */
.package-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.package-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

/* ========== 套餐项 ========== */
.package-item {
  margin-bottom: 28px;
  border-radius: 12px;
}

.package-item:last-child {
  margin-bottom: 0;
}

/* ========== 表单项优化 ========== */
.form-tip {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

/* ========== 快捷回复区域 ========== */
.quick-replies-wrapper {
  width: 100%;
}

.quick-replies-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 14px;
}

.reply-item {
  width: 100%;
}

.empty-quick-replies {
  text-align: center;
  padding: 30px 0;
}

/* ========== Logo上传 ========== */
.logo-upload {
  display: flex;
  align-items: center;
  gap: 20px;
}

.upload-tip {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}

.logo-preview {
  display: flex;
  align-items: center;
}

/* ========== 分割线优化 ========== */
:deep(.el-divider__text) {
  font-size: 15px;
  font-weight: bold;
  color: #409EFF;
}

/* ========== 按钮优化 ========== */
.el-button--large {
  padding: 12px 28px;
  font-size: 15px;
}

/* ========== 卡片内部间距优化 ========== */
:deep(.el-card__body) {
  padding: 24px;
}
</style>
