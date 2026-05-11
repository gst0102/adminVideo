<template>
  <div class="chat-container">
    <el-row :gutter="20">
      <!-- 左侧：用户列表 -->
      <el-col :span="8">
        <el-card shadow="hover" class="user-list-card">
          <template #header>
            <div class="card-header">
              <span>咨询用户</span>
              <el-badge :value="unreadCount" :hidden="unreadCount === 0" type="danger">
                <span></span>
              </el-badge>
            </div>
          </template>

          <!-- 搜索 -->
          <el-input
            v-model="searchKeyword"
            placeholder="搜索用户..."
            prefix-icon="Search"
            clearable
            style="margin-bottom: 16px;"
          />

          <!-- 用户列表 -->
          <div class="user-list">
            <div
              v-for="user in filteredUsers"
              :key="user.user_id"
              class="user-item"
              :class="{ active: currentUser?.user_id === user.user_id }"
              @click="selectUser(user)"
            >
              <div class="user-avatar">
                <el-avatar :size="40">{{ (user.user_name || '用').charAt(0) }}</el-avatar>
                <div class="online-dot" v-if="!user.last_read"></div>
              </div>
              <div class="user-info">
                <div class="user-name">{{ user.user_name || '未知用户' }}</div>
                <div class="last-message">{{ user.last_message || '暂无消息' }}</div>
              </div>
              <div class="user-time">{{ formatTime(user.last_time) }}</div>
            </div>

            <el-empty v-if="filteredUsers.length === 0" description="暂无聊天记录" />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：聊天窗口 -->
      <el-col :span="16">
        <el-card shadow="hover" class="chat-window">
          <template #header v-if="currentUser">
            <div class="chat-header">
              <div class="chat-user-info">
                <el-avatar :size="32">{{ (currentUser.user_name || '用').charAt(0) }}</el-avatar>
                <div>
                  <div class="chat-user-name">{{ currentUser.user_name || '未知用户' }}</div>
                  <div class="chat-user-id">ID: {{ currentUser.user_id?.substring(0, 10) }}...</div>
                </div>
              </div>
              <div class="chat-actions">
                <el-button size="small" icon="View" @click="viewUserProfile">查看资料</el-button>
              </div>
            </div>
          </template>

          <template #default>
            <div v-if="currentUser" class="chat-content">
              <!-- 消息列表 -->
              <div ref="messageListRef" class="message-list">
                <div
                  v-for="(msg, index) in messages"
                  :key="index"
                  class="message-item"
                  :class="msg.sender"
                >
                  <div class="avatar-wrapper">
                    <el-avatar
                      :size="36"
                      :class="msg.sender === 'admin' ? 'admin-avatar' : 'user-avatar'"
                    >
                      {{ msg.sender === 'admin' ? '客' : (msg.sender_name || '用').charAt(0) }}
                    </el-avatar>
                  </div>
                  <div class="message-body">
                    <div class="sender-name">
                      {{ msg.sender === 'admin' ? '客服小助手' : (msg.sender_name || '用户') }}
                    </div>
                    <div class="message-bubble">
                      {{ msg.content }}
                    </div>
                    <div class="message-time">{{ formatTime(msg.created_at) }}</div>
                  </div>
                </div>

                <div v-if="messages.length === 0" class="empty-chat">
                  <el-empty description="暂无消息，开始对话吧！" />
                </div>
              </div>

              <!-- 输入框 -->
              <div class="input-area">
                <el-input
                  v-model="inputMessage"
                  type="textarea"
                  :rows="2"
                  placeholder="输入回复内容..."
                  :maxlength="1000"
                  show-word-limit
                  @keyup.enter.ctrl.exact="sendMessage"
                />
                <div class="input-actions">
                  <el-dropdown trigger="click" @command="insertQuickReply">
                    <el-button size="small">快捷回复</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item
                          v-for="(reply, index) in quickReplies"
                          :key="index"
                          :command="reply"
                        >
                          {{ reply.substring(0, 15) }}{{ reply.length > 15 ? '...' : '' }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button
                    type="primary"
                    :disabled="!inputMessage.trim()"
                    :loading="sending"
                    @click="sendMessage"
                  >
                    发送
                  </el-button>
                </div>
              </div>
            </div>

            <div v-else class="no-chat-selected">
              <el-empty description="请从左侧选择一个用户开始对话" />
            </div>
          </template>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '@/store'
import dayjs from 'dayjs'

const adminStore = useAdminStore()

const searchKeyword = ref('')
const currentUser = ref<any>(null)
const messages = ref<any[]>([])
const inputMessage = ref('')
const sending = ref(false)
const messageListRef = ref<HTMLElement>()

const userList = ref<any[]>([])
const unreadCount = ref(0)

const quickReplies = [
  '您好，请问有什么可以帮您的？',
  '关于会员问题，您可以查看会员权益说明。',
  '提现问题一般1-3个工作日到账，如有异常请联系我们。',
  '感谢您的反馈，我们会尽快处理！',
  '抱歉让您久等了，我马上为您查询。'
]

// 过滤后的用户列表
const filteredUsers = computed(() => {
  if (!searchKeyword.value) return userList.value
  
  const keyword = searchKeyword.value.toLowerCase()
  return userList.value.filter(user =>
    user.user_name?.toLowerCase().includes(keyword) ||
    user.user_id?.toLowerCase().includes(keyword)
  )
})

onMounted(async () => {
  await loadChatUsers()
})

// 加载有聊天的用户列表
const loadChatUsers = async () => {
  try {
    const allMessages = await adminStore.getChatMessages()
    
    // 按用户分组
    const userMap = new Map<string, any>()
    
    allMessages.forEach((msg: any) => {
      if (!userMap.has(msg.user_id)) {
        userMap.set(msg.user_id, {
          user_id: msg.user_id,
          user_name: msg.user_name,
          last_message: msg.content,
          last_time: msg.created_at,
          last_read: msg.is_read,
          unread_count: 0
        })
      }
      
      const user = userMap.get(msg.user_id)!
      
      // 更新最新消息
      if (new Date(msg.created_at) > new Date(user.last_time)) {
        user.last_message = msg.content
        user.last_time = msg.created_at
      }
      
      // 统计未读
      if (!msg.is_read && msg.sender === 'user') {
        user.unread_count++
      }
    })
    
    userList.value = Array.from(userMap.values())
      .sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime())
    
    // 计算总未读数
    unreadCount.value = userList.value.reduce((sum, u) => sum + u.unread_count, 0)
  } catch (error) {
    console.error('加载用户列表失败:', error)
  }
}

// 选择用户
const selectUser = async (user: any) => {
  currentUser.value = user
  
  // 标记为已读
  user.unread_count = 0
  user.last_read = true
  unreadCount.value = Math.max(0, unreadCount.value - 1)
  
  // 加载该用户的聊天记录
  await loadMessages(user.user_id)
}

// 加载消息
const loadMessages = async (userId: string) => {
  try {
    messages.value = await adminStore.getChatMessages(userId)
    
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('加载消息失败:', error)
  }
}

// 发送消息
const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content || !currentUser.value) return

  sending.value = true
  try {
    // 先在界面显示（乐观更新）
    messages.value.push({
      sender: 'admin',
      sender_name: '客服小助手',
      content,
      created_at: new Date(),
      is_read: false
    })

    inputMessage.value = ''
    scrollToBottom()

    // 发送到数据库
    await adminStore.sendReply(currentUser.value.user_id, content)

    // 更新用户列表的最后消息
    const user = userList.value.find(u => u.user_id === currentUser.value.user_id)
    if (user) {
      user.last_message = content
      user.last_time = new Date()
    }
  } catch (error) {
    console.error('发送失败:', error)
    ElMessage.error('发送失败')
    // 移除临时消息
    messages.value.pop()
  } finally {
    sending.value = false
  }
}

// 插入快捷回复
const insertQuickReply = (reply: string) => {
  inputMessage.value += (inputMessage.value ? '\n' : '') + reply
}

// 查看用户资料
const viewUserProfile = () => {
  if (currentUser.value) {
    ElMessage.info(`查看用户 ${currentUser.value.user_name} 的详细资料`)
  }
}

// 滚动到底部
const scrollToBottom = () => {
  setTimeout(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  }, 100)
}

// 格式化时间
const formatTime = (time: any) => {
  if (!time) return ''
  
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1分钟
  if (diff < 60000) return '刚刚'
  // 小于1小时
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  // 小于24小时
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  // 小于7天
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return dayjs(date).format('MM-DD HH:mm')
}
</script>

<style scoped>
.chat-container {
  padding: 0;
  height: calc(100vh - 120px);
}

.user-list-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.user-item:hover {
  background-color: #f5f7fa;
}

.user-item.active {
  background-color: #e6f7ff;
}

.user-avatar {
  position: relative;
  flex-shrink: 0;
}

.online-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #67C23A;
  border: 2px solid #fff;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.last-message {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4px;
}

.user-time {
  font-size: 12px;
  color: #ccc;
  flex-shrink: 0;
}

/* 聊天窗口 */
.chat-window {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-user-name {
  font-weight: bold;
  font-size: 14px;
}

.chat-user-id {
  font-size: 12px;
  color: #999;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100% - 120px);
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f7fa;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-item.admin {
  flex-direction: row-reverse;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.admin-avatar {
  background: linear-gradient(135deg, #409EFF 0%, #36d1dc 100%);
  color: #fff;
}

.user-avatar {
  background: linear-gradient(135deg, #67C23A 0%, #4cae4c 100%);
  color: #fff;
}

.message-body {
  max-width: 70%;
}

.message-item .message-body {
  align-items: flex-start;
}

.message-item.admin .message-body {
  align-items: flex-end;
}

.sender-name {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.message-item.admin .sender-name {
  text-align: right;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  word-break: break-all;
  line-height: 1.6;
  font-size: 14px;
}

.message-item.admin .message-bubble {
  background: #409EFF;
  color: #fff;
}

.message-time {
  font-size: 11px;
  color: #ccc;
  margin-top: 6px;
}

.empty-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.no-chat-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.input-area {
  padding: 16px;
  background: #fff;
  border-top: 1px solid #eee;
}

.input-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
