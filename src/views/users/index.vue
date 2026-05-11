<template>
  <div class="users-container">
    <!-- 搜索栏 -->
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="昵称/邀请码"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="VIP状态">
          <el-select v-model="searchForm.isVip" placeholder="全部" clearable>
            <el-option label="是" :value="1" />
            <el-option label="否" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <span class="total-text">共 {{ pagination.total }} 条记录</span>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="userList"
        stripe
        border
        size="default"
      >
        <el-table-column type="index" label="#" width="50" />

        <el-table-column label="用户信息" min-width="200">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="40" :src="row.avatar">{{ (row.nickname || '用').charAt(0) }}</el-avatar>
              <div class="info-detail">
                <div class="nickname">{{ row.nickname || '未设置' }}</div>
                <div class="invite-code">邀请码: {{ row.invite_code }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="invite_count_1" label="一级下线" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="warning">{{ row.invite_count_1 || 0 }}人</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="invite_count_2" label="二级下线" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info">{{ row.invite_count_2 || 0 }}人</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="is_vip" label="VIP" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_vip ? 'success' : 'info'">
              {{ row.is_vip ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="收益数据" min-width="200">
          <template #default="{ row }">
            <div class="income-data">
              <div>总收益: <span class="money">¥{{ parseFloat(row.total_Inc || 0).toFixed(2) }}</span></div>
              <div>未提现: <span class="money new">¥{{ parseFloat(row.new_Inc || 0).toFixed(2) }}</span></div>
              <div>已提现: <span class="money old">¥{{ parseFloat(row.old_Inc || 0).toFixed(2) }}</span></div>
              <div>冻结: <span class="money frozen">¥{{ parseFloat(row.frozen_amount || 0).toFixed(2) }}</span></div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              查看详情
            </el-button>
            <el-button type="warning" link size="small" @click="viewSubUsers(row)">
              下线列表
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '@/store'
import dayjs from 'dayjs'

const router = useRouter()
const adminStore = useAdminStore()

const loading = ref(false)
const userList = ref<any[]>([])

const searchForm = reactive({
  keyword: '',
  isVip: undefined as number | undefined
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

onMounted(() => {
  loadUserList()
})

const loadUserList = async () => {
  loading.value = true
  try {
    const result = await adminStore.getUserList(
      pagination.page,
      pagination.pageSize,
      searchForm.keyword || undefined
    )
    
    userList.value = result.list
    pagination.total = result.total
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadUserList()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.isVip = undefined
  handleSearch()
}

const handleSizeChange = () => {
  pagination.page = 1
  loadUserList()
}

const handlePageChange = () => {
  loadUserList()
}

const viewDetail = (row: any) => {
  router.push(`/users/detail/${row._id}`)
}

const viewSubUsers = (row: any) => {
  ElMessage.info(`查看 ${row.nickname} 的下线列表（功能开发中）`)
}

const formatTime = (time: any) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped>
.users-container {
  padding: 0;
}

.search-card .el-form-item {
  margin-bottom: 0;
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

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-detail {
  flex: 1;
}

.nickname {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.invite-code {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.income-data {
  font-size: 12px;
  line-height: 1.8;
  color: #666;
}

.money {
  font-weight: bold;
  color: #409EFF;
}

.money.new {
  color: #67C23A;
}

.money.old {
  color: #E6A23C;
}

.money.frozen {
  color: #F56C6C;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
