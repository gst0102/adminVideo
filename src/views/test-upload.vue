<template>
  <div style="max-width: 900px; margin: 20px auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
    <h1 style="text-align: center; color: #333; margin-bottom: 30px;">🚀 云函数接口测试工具</h1>

    <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #667eea;">
      <h2 style="color: #667eea; font-size: 20px; margin-bottom: 16px;">
        📡 测试1：接口连通性 (后端代理)
        <span :class="['status-badge', status1Class]" style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;margin-left:8px;">{{ status1Text }}</span>
      </h2>
      <p style="color:#666;margin-bottom:16px">通过后端代理调用 admin-upload，无请求体大小限制</p>
      <el-button type="primary" @click="testConnection" :loading="testing1" :disabled="testing1">
        开始测试连接
      </el-button>
      <pre v-if="result1" style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:8px;font-family:'Courier New',monospace;font-size:14px;line-height:1.6;max-height:300px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;margin-top:16px;">{{ result1 }}</pre>
    </div>

    <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #667eea;">
      <h2 style="color: #667eea; font-size: 20px; margin-bottom: 16px;">
        🖼️ 测试2：图片上传
        <span :class="['status-badge', status2Class]" style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;margin-left:8px;">{{ status2Text }}</span>
      </h2>
      <p style="color:#666;margin-bottom:16px">选择图片上传到云存储（无 HTTP 触发器大小限制）</p>

      <input type="file" ref="fileInputRef" accept="image/*" style="display:none" @change="handleFileSelect">

      <div @click="triggerFileInput" style="border:3px dashed #cbd5e1;border-radius:12px;padding:40px;text-align:center;cursor:pointer;background:#f8fafc;" :style="{ borderColor: selectedFile ? '#4ade80' : '', backgroundColor: selectedFile ? '#f0fdf4' : '' }">
        <div style="font-size:48px">{{ selectedFile ? '✅' : '📁' }}</div>
        <div style="font-size:18px;color:#333;margin-top:8px">{{ selectedFile ? '已选择文件' : '点击选择图片文件' }}</div>
        <div v-if="!selectedFile" style="font-size:14px;color:#999;margin-top:8px">支持 JPG、PNG、GIF、WebP 格式</div>
      </div>

      <div v-if="selectedFile" style="margin-top:16px;padding:12px;background:#e0f2fe;border-radius:8px;">
        ✅ 已选择：<strong>{{ selectedFile.name }}</strong> ({{ (selectedFile.size / 1024).toFixed(2) }} KB)
      </div>

      <el-button type="primary" @click="testUpload" :loading="uploading" :disabled="uploading || !selectedFile" style="margin-top:16px">
        {{ uploading ? '上传中...' : '⬆️ 上传测试' }}
      </el-button>

      <pre v-if="result2" style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:8px;font-family:'Courier New',monospace;font-size:14px;line-height:1.6;max-height:400px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;margin-top:16px;">{{ result2 }}</pre>
      <img v-if="previewUrl" :src="previewUrl" style="max-width:300px;margin-top:12px;border-radius:8px;display:block;" />
    </div>

    <div style="background:#fffbeb;border-radius:12px;padding:24px;border-left-color:#f59e0b;border-left-style:solid;border-left-width:4px;">
      <h2 style="color:#f59e0b;font-size:20px;margin-bottom:16px">⚙️ 接口配置</h2>
      <div style="background:#fef3c7;padding:16px;border-radius:8px;font-family:monospace;font-size:14px;">
        <strong>调用方式:</strong> 后端代理（FastAPI → 微信云函数）<br><br>
        <strong>后端地址:</strong> http://api.lifelove.top<br><br>
        <strong>API路径:</strong> /pc/upload<br><br>
        <strong>云函数:</strong> admin-upload<br><br>
        <strong>优势:</strong> 无请求体大小限制，统一鉴权管理
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

const testing1 = ref(false)
const status1Class = ref('status-pending')
const status1Text = ref('待测试')
const result1 = ref('')

const uploading = ref(false)
const status2Class = ref('status-pending')
const status2Text = ref('待测试')
const result2 = ref('')
const previewUrl = ref('')

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function testConnection() {
  testing1.value = true
  status1Class.value = 'status-pending'
  status1Text.value = '测试中...'
  result1.value = '正在初始化连接...\n'

  try {
    result1.value += '✅ 初始化完成\n'
    result1.value += '正在调用 admin-upload (action: test)...\n'

    const response = await axios.post('/pc/call', {
      env: 'local',
      functionName: 'admin-upload',
      action: 'test',
      data: {}
    })

    result1.value += `[响应] ${JSON.stringify(response.data, null, 2)}\n`

    status1Class.value = 'status-success'
    status1Text.value = '✅ 连通成功'
    result1.value += '\n🎉 接口连通！后端代理方式正常工作。'
  } catch (e: any) {
    status1Class.value = 'status-error'
    status1Text.value = '❌ 失败'
    result1.value += `\n❌ 错误: ${e.message}\n\n可能原因:\n1. 后端服务未启动\n2. 微信 access_token 获取失败\n3. 网络问题`
  }

  testing1.value = false
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] || null
}

async function testUpload() {
  if (!selectedFile.value) return

  uploading.value = true
  status2Class.value = 'status-pending'
  status2Text.value = '上传中...'
  result2.value = ''
  previewUrl.value = ''

  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('读取失败'))
      reader.readAsDataURL(selectedFile.value!)
    })

    result2.value = `✅ 文件读取成功\n   文件名: ${selectedFile.value.name}\n   大小: ${(selectedFile.value.size / 1024).toFixed(2)} KB\n   Base64: ${base64Data.length} 字符 (~${(base64Data.length * 3 / 4 / 1024).toFixed(1)} KB)\n通过后端代理上传（无大小限制）...\n`

    const response = await axios.post('/pc/call', {
      env: 'local',
      functionName: 'admin-upload',
      action: 'uploadImage',
      data: {
        base64Data,
        fileName: selectedFile.value.name,
        folder: 'banner'
      }
    })

    const data = response.data?.data || response.data

    result2.value += `[响应]\n${JSON.stringify(data, null, 2)}\n`

    if (data?.success) {
      status2Class.value = 'status-success'
      status2Text.value = '✅ 上传成功'
      previewUrl.value = data.tempFileURL || ''
      result2.value += `\n🎉 上传成功！无 HTTP 大小限制！\nFileID: ${data.fileID}\n路径: ${data.cloudPath}`
    } else {
      status2Class.value = 'status-error'
      status2Text.value = '❌ 失败'
      result2.value += `\n❌ 错误: ${data?.msg || '未知错误'}`
    }
  } catch (e: any) {
    status2Class.value = 'status-error'
    status2Text.value = '❌ 失败'
    result2.value = `\n❌ 错误: ${e.message}`
  }

  uploading.value = false
}
</script>

<style scoped>
.status-pending { background: #e0e7ff; color: #3730a3; }
.status-success { background: #dcfce7; color: #166534; }
.status-error { background: #fef2f2; color: #991b1b; }
</style>
