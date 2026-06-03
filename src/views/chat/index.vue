<template>
  <div class="chat-container">
    <el-row :gutter="20" style="height: 100%">
      <el-col :span="6">
        <el-card shadow="hover" class="left-panel">
          <template #header>
            <div class="panel-header">
              <span>用户消息列表</span>
              <el-badge :value="unreadCount" :max="99" />
            </div>
          </template>

          <el-input
            v-model="searchText"
            placeholder="搜索用户..."
            clearable
            size="small"
            style="margin-bottom: 12px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <div class="user-list">
            <div
              v-for="user in filteredUsers"
              :key="user.user_id"
              :class="['user-item', { active: currentUserId === user.user_id }]"
              @click="selectUser(user)"
            >
              <div class="user-avatar">
                <el-badge :is-dot="user.unread_count > 0">
                  <el-avatar :size="40">{{ user.nickname?.charAt(0) || '用' }}</el-avatar>
                </el-badge>
              </div>
              <div class="user-text">
                <div class="user-name">{{ user.nickname || user.user_name || '用户' }}</div>
                <div class="user-last-msg">{{ user.last_message || '暂无消息' }}</div>
              </div>
              <div class="user-time">{{ formatTimeShort(user.last_time) }}</div>
            </div>

            <el-empty v-if="filteredUsers.length === 0" description="暂无消息" />
          </div>
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card shadow="hover" class="right-panel">
          <template #header>
            <div class="panel-header">
              <span>{{ currentUser?.nickname || currentUser?.user_name || '选择用户' }}</span>
              <span v-if="currentUser" class="user-id">ID: {{ currentUser.user_id }}</span>
            </div>
          </template>

          <div v-if="!currentUser" class="no-select">
            <el-empty description="请选择左侧用户查看聊天" />
          </div>

          <div v-else class="chat-area">
            <div class="message-list" ref="messageListRef">
              <div
                v-for="msg in messages"
                :key="msg.id"
                :class="['message-item', msg.sender === 'admin' ? 'message-right' : 'message-left']"
              >
                <div
                  :class="['message-bubble', msg.sender === 'admin' ? 'bubble-admin' : 'bubble-user']"
                >
                  <div class="msg-content">{{ msg.content }}</div>
                  <div class="msg-time">{{ formatTime(msg.created_at) }}</div>
                </div>
              </div>
              <el-empty v-if="messages.length === 0" description="暂无聊天记录" />
            </div>

            <div class="input-area">
              <el-input
                v-model="inputText"
                type="textarea"
                :rows="3"
                placeholder="输入回复内容..."
                resize="none"
                @keydown.enter.ctrl="handleSend"
              />
              <div class="input-actions">
                <span class="input-hint">Ctrl + Enter 发送</span>
                <el-button type="primary" @click="handleSend" :loading="sending">
                  发送
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { useAdminStore } from '@/store'

const adminStore = useAdminStore()

const searchText = ref('')
const inputText = ref('')
const sending = ref(false)
const currentUserId = ref('')
const currentUser = ref<any>(null)
const messages = ref<any[]>([])
const userList = ref<any[]>([])
const messageListRef = ref<HTMLElement>()

const filteredUsers = computed(() => {
  if (!searchText.value) return userList.value
  const kw = searchText.value.toLowerCase()
  return userList.value.filter(
    (u: any) => (u.nickname || u.user_name || '').toLowerCase().includes(kw)
  )
})

const unreadCount = computed(() => {
  return userList.value.reduce((sum, u: any) => sum + (u.unread_count || 0), 0)
})

onMounted(async () => {
  await loadUserList()
})

const loadUserList = async () => {
  try {
    const result = await adminStore.getChatMessages()
    const list = Array.isArray(result) ? result : (result?.list || [])
    userList.value = list
  } catch (error) {
    console.error('加载消息列表失败:', error)
  }
}

const selectUser = async (user: any) => {
  currentUserId.value = user.user_id
  currentUser.value = user

  try {
    const result = await adminStore.getChatMessages(user.user_id)
    const list = Array.isArray(result) ? result : (result?.messages || [])
    messages.value = list.sort((a: any, b: any) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('加载消息失败:', error)
  }
}

const handleSend = async () => {
  if (!inputText.value.trim() || !currentUserId.value) return

  sending.value = true
  try {
    await adminStore.sendReply(currentUserId.value, inputText.value.trim())
    ElMessage.success('发送成功')

    messages.value.push({
      id: Date.now().toString(),
      user_id: currentUserId.value,
      sender: 'admin',
      content: inputText.value.trim(),
      created_at: new Date().toISOString()
    })

    inputText.value = ''

    await nextTick()
    scrollToBottom()
  } catch (error: any) {
    ElMessage.error('发送失败: ' + (error.message || '未知错误'))
  } finally {
    sending.value = false
  }
}

const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

const formatTime = (time: any) => {
  if (!time) return ''
  return dayjs(time).format('MM-DD HH:mm')
}

const formatTimeShort = (time: any) => {
  if (!time) return ''
  const d = dayjs(time)
  const now = dayjs()
  if (d.isSame(now, 'day')) return d.format('HH:mm')
  if (d.isSame(now, 'year')) return d.format('MM-DD')
  return d.format('YYYY-MM-DD')
}
</script>

<style scoped>
.chat-container {
  height: calc(100vh - 140px);
  padding: 0;
}

.chat-container .el-row {
  height: 100%;
}

.left-panel,
.right-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.left-panel :deep(.el-card__body),
.right-panel :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-id {
  font-size: 12px;
  color: #999;
}

.user-list {
  flex: 1;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-item:hover {
  background-color: #f5f7fa;
}

.user-item.active {
  background-color: #ecf5ff;
}

.user-text {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.user-last-msg {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-time {
  font-size: 11px;
  color: #ccc;
}

.no-select {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.message-item {
  display: flex;
  margin-bottom: 16px;
}

.message-left {
  justify-content: flex-start;
}

.message-right {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 60%;
  padding: 12px 16px;
  border-radius: 12px;
}

.bubble-user {
  background-color: #f0f2f5;
  border-top-left-radius: 4px;
}

.bubble-admin {
  background-color: #409EFF;
  color: #fff;
  border-top-right-radius: 4px;
}

.msg-content {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}

.msg-time {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
  text-align: right;
}

.input-area {
  margin-top: 12px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.input-hint {
  font-size: 12px;
  color: #ccc;
}
</style>