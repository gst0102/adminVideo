<template>
  <div class="video-container">
    <el-card shadow="hover" class="input-card">
      <template #header>
        <span class="card-title">视频链接解析下载</span>
      </template>
      <el-form :model="formData" label-width="100px">
        <el-form-item label="视频链接">
          <el-input
            v-model="formData.url"
            placeholder="请输入视频链接（支持抖音/小红书/B站/快手/头条等）"
            size="large"
            clearable
            @keyup.enter="handleGetInfo"
          >
            <template #prepend>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="画质预设">
              <el-select v-model="formData.formatPreset" size="large" style="width: 100%">
                <el-option label="快速 - 优先MP4格式" value="fast" />
                <el-option label="标准 - 限制100MB内" value="medium" />
                <el-option label="高清 - 最高质量" value="quality" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="用户ID">
              <el-input
                v-model="formData.userId"
                placeholder="输入用户标识"
                size="large"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loadingInfo" @click="handleGetInfo">
            <el-icon><Search /></el-icon> 获取视频信息
          </el-button>
          <el-button size="large" @click="handleClear">
            <el-icon><Refresh /></el-icon> 清空
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="videoInfo" shadow="hover" class="info-card" style="margin-top: 20px">
      <template #header>
        <span class="card-title">视频信息</span>
      </template>
      <div class="video-info-content">
        <div class="video-thumbnail" v-if="videoInfo.thumbnail">
          <el-image
            :src="videoInfo.thumbnail"
            fit="cover"
            style="width: 240px; height: 135px; border-radius: 8px"
            :preview-src-list="[videoInfo.thumbnail]"
          >
            <template #error>
              <div class="image-error">
                <el-icon :size="32"><Picture /></el-icon>
              </div>
            </template>
          </el-image>
        </div>
        <div class="video-meta">
          <h3 class="video-title">{{ videoInfo.title }}</h3>
          <div class="video-formats">
            <span class="format-label">可用格式：</span>
            <el-tag
              v-for="f in videoInfo.formats"
              :key="f.preset"
              :type="formData.formatPreset === f.preset ? 'success' : 'info'"
              effect="plain"
              style="margin-right: 8px"
            >
              {{ f.label }} - {{ f.description }}
            </el-tag>
          </div>
          <div class="download-actions" style="margin-top: 20px">
            <el-button type="success" size="large" @click="handleDirectDownload">
              <el-icon><Download /></el-icon> 直接下载
            </el-button>
            <el-button type="primary" size="large" :loading="downloadingWithProgress" @click="handleDownloadWithProgress">
              <el-icon><Loading v-if="downloadingWithProgress" /></el-icon>
              <el-icon v-show="!downloadingWithProgress"><DataLine /></el-icon>
              {{ downloadingWithProgress ? '下载中...' : '带进度下载' }}
            </el-button>
          </div>
          <div v-if="downloadProgress" class="progress-area" style="margin-top: 16px">
            <el-progress
              :percentage="downloadProgress.progress || 0"
              :status="downloadProgress.status === 'completed' ? 'success' : downloadProgress.status === 'error' ? 'exception' : ''"
              :stroke-width="20"
            />
            <p class="progress-text">{{ downloadProgress.message }}</p>
          </div>
        </div>
      </div>
    </el-card>

    <el-card shadow="hover" class="platform-card" style="margin-top: 20px">
      <template #header>
        <span class="card-title">支持平台</span>
      </template>
      <el-row :gutter="16">
        <el-col :span="4" v-for="platform in platforms" :key="platform.name">
          <div class="platform-item">
            <div class="platform-icon" :style="{ background: platform.color }">
              <el-icon :size="24"><component :is="platform.icon" /></el-icon>
            </div>
            <div class="platform-name">{{ platform.name }}</div>
            <div class="platform-desc">{{ platform.desc }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '@/store'
import { getVideoDownloadUrl, downloadVideoWithProgress } from '@/utils/api'
import type { VideoInfoData, VideoProgressEvent } from '@/utils/api'

const adminStore = useAdminStore()

const formData = reactive({
  url: '',
  userId: 'admin_user',
  formatPreset: 'fast'
})

const loadingInfo = ref(false)
const downloadingWithProgress = ref(false)
const videoInfo = ref<VideoInfoData | null>(null)
const downloadProgress = ref<VideoProgressEvent | null>(null)

const platforms = [
  { name: '抖音', icon: 'VideoCamera', color: '#000', desc: '短链+API+浏览器' },
  { name: '小红书', icon: 'Notebook', color: '#FF2442', desc: 'SSR解析' },
  { name: 'B站', icon: 'VideoPlay', color: '#FB7299', desc: '公开API' },
  { name: '快手', icon: 'Crop', color: '#FF4906', desc: '浏览器渲染' },
  { name: '头条', icon: 'Document', color: '#E13A3E', desc: 'yt-dlp' },
  { name: '其他', icon: 'Connection', color: '#409EFF', desc: 'yt-dlp兜底' }
]

const handleGetInfo = async () => {
  if (!formData.url.trim()) {
    ElMessage.warning('请输入视频链接')
    return
  }
  if (!formData.userId.trim()) {
    ElMessage.warning('请输入用户ID')
    return
  }

  loadingInfo.value = true
  videoInfo.value = null
  downloadProgress.value = null

  try {
    const data = await adminStore.getVideoInfo(formData.url, formData.userId, formData.formatPreset)
    videoInfo.value = data
    ElMessage.success('获取视频信息成功')
  } catch (error: any) {
    ElMessage.error('获取失败: ' + (error.message || '未知错误'))
  } finally {
    loadingInfo.value = false
  }
}

const handleDirectDownload = () => {
  if (!videoInfo.value) return

  const downloadUrl = getVideoDownloadUrl(formData.userId, formData.url, formData.formatPreset)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = videoInfo.value.title || 'video.mp4'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  ElMessage.success('开始下载')
}

const handleDownloadWithProgress = async () => {
  if (!videoInfo.value) return

  downloadingWithProgress.value = true
  downloadProgress.value = null

  try {
    await downloadVideoWithProgress(
      formData.url,
      formData.userId,
      formData.formatPreset,
      (event) => {
        downloadProgress.value = event
        if (event.status === 'completed' && event.download_url) {
          const a = document.createElement('a')
          a.href = event.download_url
          a.download = event.video_title || 'video.mp4'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          ElMessage.success('下载完成')
        } else if (event.status === 'error') {
          ElMessage.error('下载失败: ' + event.message)
        }
      }
    )
  } catch (error: any) {
    ElMessage.error('下载失败: ' + (error.message || '未知错误'))
  } finally {
    downloadingWithProgress.value = false
  }
}

const handleClear = () => {
  formData.url = ''
  videoInfo.value = null
  downloadProgress.value = null
}
</script>

<style scoped>
.video-container {
  padding: 0;
}

.card-title {
  font-size: 16px;
  font-weight: bold;
}

.video-info-content {
  display: flex;
  gap: 24px;
}

.video-thumbnail {
  flex-shrink: 0;
}

.image-error {
  width: 240px;
  height: 135px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  color: #ccc;
}

.video-meta {
  flex: 1;
}

.video-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
}

.format-label {
  font-size: 14px;
  color: #666;
  margin-right: 8px;
}

.progress-area {
  max-width: 500px;
}

.progress-text {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #999;
}

.platform-item {
  text-align: center;
  padding: 16px 8px;
  border-radius: 8px;
  background: #f5f7fa;
  transition: transform 0.2s;
}

.platform-item:hover {
  transform: translateY(-4px);
}

.platform-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  color: #fff;
}

.platform-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.platform-desc {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>