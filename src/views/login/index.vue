<template>
  <div class="login-page">
    <section class="login-panel">
      <div class="mark">
        <el-icon :size="32"><Collection /></el-icon>
      </div>
      <h1>悦享资源库运营后台</h1>
      <p>资源审核、投诉处理、积分风控</p>

      <el-form ref="formRef" :model="formData" :rules="rules" class="login-form" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="formData.username" size="large" placeholder="账号" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="formData.password"
            size="large"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button type="primary" size="large" :loading="adminStore.loading" class="login-btn" @click="handleLogin">
          {{ adminStore.loading ? '登录中' : '进入后台' }}
        </el-button>
      </el-form>

      <div class="tips">默认账号：admin / admin123</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAdminStore } from '@/store'

const router = useRouter()
const adminStore = useAdminStore()
const formRef = ref<FormInstance>()
const formData = reactive({ username: 'admin', password: 'admin123' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    await adminStore.login(formData.username, formData.password)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  background: #eef4f1;
}

.login-panel {
  width: 390px;
  padding: 38px;
  background: #fff;
  border: 1px solid #dfe7e4;
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(23, 32, 51, 0.12);
}

.mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  color: #0f766e;
  background: #e7f6f2;
  border-radius: 8px;
}

h1 {
  margin: 22px 0 8px;
  color: #172033;
  font-size: 26px;
}

p {
  margin: 0;
  color: #697386;
}

.login-form {
  margin-top: 28px;
}

.login-btn {
  width: 100%;
}

.tips {
  margin-top: 18px;
  color: #8a96a8;
  font-size: 12px;
  text-align: center;
}
</style>
