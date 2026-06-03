<template>
  <div class="anime-container">
    <el-card shadow="hover" class="toolbar-card">
      <el-row :gutter="20" align="middle">
        <el-col :span="8">
          <el-radio-group v-model="currentType" size="large" @change="handleTypeChange">
            <el-radio-button value="anime">番剧</el-radio-button>
            <el-radio-button value="movie">电影</el-radio-button>
            <el-radio-button value="4k">4K影视</el-radio-button>
          </el-radio-group>
        </el-col>
        <el-col :span="8">
          <el-input
            v-model="keyword"
            placeholder="搜索标题..."
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="8" style="text-align: right">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button :loading="syncing" @click="handleSync">
            <el-icon><Refresh /></el-icon> 同步数据
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>资源列表</span>
          <span class="total-text">共 {{ total }} 条记录</span>
        </div>
      </template>

      <el-table v-loading="loading" :data="resourceList" stripe border size="default">
        <el-table-column type="index" label="#" width="50" />

        <el-table-column prop="title" label="标题" min-width="250" show-overflow-tooltip />

        <el-table-column prop="quality" label="画质" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.quality === '4K' ? 'danger' : row.quality === '1080P' ? 'success' : 'info'"
              size="small"
            >
              {{ row.quality || '-' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="episode" label="集数" width="120" show-overflow-tooltip />

        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === '更新中' ? 'warning' : row.status === '完结' ? 'success' : 'info'"
              size="small"
            >
              {{ row.status || '-' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="网盘链接" min-width="300">
          <template #default="{ row }">
            <div class="link-group">
              <div v-if="row.baidu_url" class="link-item">
                <el-tag type="primary" size="small" effect="plain">百度</el-tag>
                <span class="link-text">{{ row.baidu_url }}</span>
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="copyLink(row.baidu_url, '百度网盘链接')"
                >
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
              <div v-if="row.baidu_password" class="link-item">
                <el-tag type="warning" size="small" effect="plain">提取码</el-tag>
                <span class="link-text">{{ row.baidu_password }}</span>
                <el-button
                  type="warning"
                  link
                  size="small"
                  @click="copyLink(row.baidu_password, '百度提取码')"
                >
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
              <div v-if="row.quark_url" class="link-item">
                <el-tag type="success" size="small" effect="plain">夸克</el-tag>
                <span class="link-text">{{ row.quark_url }}</span>
                <el-button
                  type="success"
                  link
                  size="small"
                  @click="copyLink(row.quark_url, '夸克网盘链接')"
                >
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
              <div v-if="row['4k_url']" class="link-item">
                <el-tag type="danger" size="small" effect="plain">4K</el-tag>
                <span class="link-text">{{ row['4k_url'] }}</span>
                <el-button
                  type="danger"
                  link
                  size="small"
                  @click="copyLink(row['4k_url'], '4K网盘链接')"
                >
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="update_time" label="更新时间" width="140" align="center" />
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '@/store'
import type { AnimeResource } from '@/utils/api'

const adminStore = useAdminStore()

const currentType = ref('anime')
const keyword = ref('')
const loading = ref(false)
const syncing = ref(false)
const resourceList = ref<AnimeResource[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(100)

onMounted(() => {
  loadResources()
})

const loadResources = async () => {
  loading.value = true
  try {
    const data = await adminStore.getAnimeResources(currentType.value, keyword.value || undefined, page.value, pageSize.value)
    resourceList.value = data.list
    total.value = data.total
  } catch (error: any) {
    ElMessage.error('加载失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const handleTypeChange = () => {
  page.value = 1
  keyword.value = ''
  loadResources()
}

const handleSearch = () => {
  page.value = 1
  loadResources()
}

const handlePageChange = () => {
  loadResources()
}

const handleSync = async () => {
  syncing.value = true
  try {
    const result = await adminStore.syncAnime(currentType.value)
    if (result.error) {
      throw new Error(result.error)
    }
    ElMessage.success(`同步完成：更新 ${result.synced} 条，失效 ${result.inactive} 条`)
    await loadResources()
  } catch (error: any) {
    if (error.message?.includes('429')) {
      ElMessage.warning('同步频率过高，番剧每15分钟、电影/4K每天凌晨自动同步')
    } else {
      ElMessage.error('同步失败: ' + (error.message || '未知错误'))
    }
  } finally {
    syncing.value = false
  }
}

const copyLink = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制到剪贴板`)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success(`${label}已复制到剪贴板`)
  }
}
</script>

<style scoped>
.anime-container {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.total-text {
  color: #999;
  font-size: 14px;
}

.link-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.link-text {
  font-size: 12px;
  color: #666;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
