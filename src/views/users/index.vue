<template>
  <div class="users-container">
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="昵称 / 邀请码 / OpenID"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="VIP 状态">
          <el-select v-model="searchForm.isVip" placeholder="全部" clearable style="width: 140px">
            <el-option label="VIP" :value="true" />
            <el-option label="非 VIP" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <span class="total-text">共 {{ pagination.total }} 条记录</span>
        </div>
      </template>

      <el-table v-loading="loading" :data="userList" stripe border>
        <el-table-column type="index" label="#" width="50" />
        <el-table-column label="用户信息" min-width="240">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="40" :src="row.avatar">{{ (row.nickname || 'U').charAt(0) }}</el-avatar>
              <div class="info-detail">
                <div class="nickname">{{ row.nickname || '未设置昵称' }}</div>
                <div class="meta">邀请码：{{ row.invite_code }}</div>
                <div class="meta">OpenID：{{ row.openid }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="invite_count" label="一级下线" width="100" align="center" />
        <el-table-column prop="team_count" label="团队人数" width="100" align="center" />

        <el-table-column label="VIP" width="180">
          <template #default="{ row }">
            <div class="vip-cell">
              <el-tag :type="row.is_vip ? 'success' : 'info'">{{ row.is_vip ? '是' : '否' }}</el-tag>
              <div class="vip-expire">{{ row.vip_expire_at ? formatTime(row.vip_expire_at) : '-' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="收益数据" min-width="220">
          <template #default="{ row }">
            <div class="income-data">
              <div>总收入：<span class="money">¥{{ Number(row.total_income || 0).toFixed(2) }}</span></div>
              <div>余额：<span class="money new">¥{{ Number(row.balance || 0).toFixed(2) }}</span></div>
              <div>已提现：<span class="money old">¥{{ Number(row.total_withdrawn || 0).toFixed(2) }}</span></div>
              <div>冻结：<span class="money frozen">¥{{ Number(row.frozen_balance || 0).toFixed(2) }}</span></div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">查看详情</el-button>
            <el-button type="success" link size="small" @click="openVipDialog(row)">修改 VIP</el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <el-dialog v-model="vipDialogVisible" title="修改 VIP" width="480px">
      <el-form label-width="110px">
        <el-form-item label="用户">
          <span>{{ activeUser?.nickname || '未知用户' }}</span>
        </el-form-item>
        <el-form-item label="VIP 开关">
          <el-switch v-model="vipForm.is_vip" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <el-form-item label="到期时间" v-if="vipForm.is_vip">
          <el-date-picker
            v-model="vipForm.vip_expire_at"
            type="datetime"
            placeholder="请选择到期时间"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitVipUpdate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { useAdminStore } from '@/store'

const router = useRouter()
const adminStore = useAdminStore()

const loading = ref(false)
const userList = ref<any[]>([])
const vipDialogVisible = ref(false)
const activeUser = ref<any | null>(null)

const searchForm = reactive({
  keyword: '',
  isVip: undefined as boolean | undefined,
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const vipForm = reactive({
  is_vip: false,
  vip_expire_at: null as Date | null,
})

const loadUserList = async () => {
  loading.value = true
  try {
    const result = await adminStore.getUserList(
      pagination.page,
      pagination.pageSize,
      searchForm.keyword || undefined,
      searchForm.isVip,
    )
    userList.value = result?.list || []
    pagination.total = result?.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
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
  pagination.page = 1
  loadUserList()
}

const handleSizeChange = () => {
  pagination.page = 1
  loadUserList()
}

const handlePageChange = () => {
  loadUserList()
}

const viewDetail = (row: any) => {
  router.push(`/users/detail/${row.id}`)
}

const openVipDialog = (row: any) => {
  activeUser.value = row
  vipForm.is_vip = Boolean(row.is_vip)
  vipForm.vip_expire_at = row.vip_expire_at ? new Date(row.vip_expire_at) : new Date(Date.now() + 30 * 24 * 3600 * 1000)
  vipDialogVisible.value = true
}

const submitVipUpdate = async () => {
  if (!activeUser.value) return
  if (vipForm.is_vip && !vipForm.vip_expire_at) {
    ElMessage.warning('请设置 VIP 到期时间')
    return
  }
  try {
    await adminStore.updateUserVip(activeUser.value.id, {
      is_vip: vipForm.is_vip,
      vip_expire_at: vipForm.is_vip && vipForm.vip_expire_at ? dayjs(vipForm.vip_expire_at).toISOString() : null,
    })
    ElMessage.success('VIP 已更新')
    vipDialogVisible.value = false
    await loadUserList()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

const formatTime = (time: any) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(loadUserList)
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
  font-weight: 600;
  color: #333;
}

.meta {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.vip-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vip-expire {
  font-size: 12px;
  color: #666;
}

.income-data {
  font-size: 12px;
  line-height: 1.8;
  color: #666;
}

.money {
  font-weight: 600;
  color: #409eff;
}

.money.new {
  color: #67c23a;
}

.money.old {
  color: #e6a23c;
}

.money.frozen {
  color: #f56c6c;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
