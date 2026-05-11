/**
 * Admin API 服务 - 本地开发用
 * 
 * 作用：Admin (Vue) → 本地API服务器 → 微信云函数 → 数据库
 * 
 * 使用方式：
 * 1. npm install 安装依赖
 * 2. node server.js 启动服务
 * 3. Admin前端调用 http://localhost:3000/api/...
 */

const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
const PORT = 3000

// 中间件
app.use(cors())
app.use(express.json())

// ========== 配置 ==========
// ⚠️ 需要填入你的配置信息

// 方式1：如果你有微信云开发的 SecretId 和 SecretKey（推荐用于生产环境）
// 获取方式：腾讯云控制台 → 访问管理 → API密钥管理
const SECRET_ID = process.env.SECRET_ID || ''
const SECRET_KEY = process.env.SECRET_KEY || ''
const ENV_ID = 'cloud1-0gnyce4y6d0e6caa'

// 方式2：直接访问云函数的HTTP触发地址（需要先在控制台开启）
// 格式: https://{env}.service.tcloudbase.com/{functionName}
// const CLOUD_FUNCTION_URL = `https://${ENV_ID}.service.tcloudbase.com/admin-api`

// ========== 辅助函数 ==========

// 简单的HMAC-SHA1签名（实际应该用crypto库）
function createSignature(secretKey, method, path, timestamp) {
  const crypto = require('crypto')
  const stringToSign = `${method}${path}${timestamp}`
  return crypto.createHmac('sha1', secretKey).update(stringToSign).digest('base64')
}

// 调用微信云开发HTTP API执行云函数
async function callCloudFunction(action, data = {}) {
  console.log(`[API] 调用云函数: ${action}`, data)

  try {
    // 方式1：通过HTTP API调用云函数
    if (SECRET_ID && SECRET_KEY) {
      const timestamp = Math.floor(Date.now() / 1000)
      const path = `/v1.0/functions/${ENV_ID}:admin-api/invoke`
      const signature = createSignature(SECRET_KEY, 'POST', path, timestamp)

      const response = await axios.post(
        `https://api.tcloudbase.com${path}`,
        {
          env: ENV_ID,
          function_name: 'admin-api',
          request_data: { action, data }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Cloud-Timestamp': timestamp.toString(),
            'X-Cloud-Signature': signature,
            'X-Cloud-SecretId': SECRET_ID
          },
          timeout: 10000
        }
      )

      const result = response.data
      console.log(`[API] 云函数返回:`, result)

      if (result.code === 0 || result.code === 200) {
        return { success: true, data: result.data || result.response_data?.resp_data }
      } else {
        throw new Error(result.message || result.msg || '云函数执行失败')
      }
    }

    // 方式2：如果没有密钥，返回模拟数据（仅用于开发测试）
    console.log('[API] WARN: 未配置密钥，返回模拟数据')
    return getMockData(action, data)

  } catch (error) {
    console.error(`[API] 调用失败 (${action}):`, error.message)
    throw error
  }
}

// 模拟数据（当无法连接云函数时使用）
function getMockData(action, data) {
  console.log(`[Mock] 返回模拟数据: ${action}`)

  switch (action) {
    case 'getDashboardStats':
      return {
        success: true,
        data: {
          userCount: 128,
          vipCount: 45,
          todayCount: 12,
          totalIncome: '15890.50',
          newIncTotal: '8960.00',
          oldIncTotal: '6930.50',
          frozenTotal: '1200.00',
          withdrawalCount: 89,
          pendingWithdrawals: 5,
          successWithdrawalAmount: '12580.00'
        }
      }

    case 'getConfig':
      return {
        success: true,
        data: data?.type ? getDefaultConfig(data.type) : null
      }

    case 'updateConfig':
      console.log('[Mock] 模拟保存配置:', data)
      return { success: true, msg: '配置已保存（模拟）' }

    case 'getUserList':
      return {
        success: true,
        data: { list: [], total: 0, page: data?.page || 1, pageSize: data?.pageSize || 20 }
      }

    case 'getWithdrawalList':
      return { success: true, data: [] }

    case 'processWithdrawal':
      return { success: true, msg: `已${data?.action === 'approve' ? '通过' : '拒绝'}（模拟）` }

    default:
      return { success: false, msg: `未知操作: ${action}` }
  }
}

function getDefaultConfig(type) {
  switch (type) {
    case 'vip_settings':
      return {
        type: 'vip_settings',
        enabled: true,
        packages: [
          { name: '月度会员', price: 9.9, duration: 1, originalPrice: 19.9, benefits: '免广告\n专属客服\n高清画质', period: 'month' },
          { name: '季度会员', price: 26.9, duration: 3, originalPrice: 59.7, benefits: '免广告\n专属客服\n高清画质\n优先处理', period: 'quarter' },
          { name: '年度会员', price: 88.8, duration: 12, originalPrice: 238.8, benefits: '免广告\n专属客服\n高清画质\n优先处理\n专属标识', period: 'year' }
        ]
      }

    case 'withdrawal_config':
      return {
        type: 'withdrawal_config',
        minWithdrawal: 0.1,
        maxWithdrawal: 200,
        withdrawalTips: '1. 提现将在1-3个工作日内到账\n2. 单次提现最低0.1元\n3. 如有问题请联系客服'
      }

    default:
      return {}
  }
}

// ========== API 路由 ==========

// 统一请求处理
app.post('/api/:action', async (req, res) => {
  try {
    const { action } = req.params
    const data = req.body

    console.log(`\n[API] 收到请求: POST /api/${action}`)
    console.log('[API] 请求数据:', JSON.stringify(data).substring(0, 200))

    const result = await callCloudFunction(action, data)

    res.json({
      code: 200,
      success: true,
      ...result
    })

  } catch (error) {
    console.error('[API] 错误:', error.message)
    res.status(500).json({
      code: 500,
      success: false,
      message: error.message || '服务器错误'
    })
  }
})

// GET请求支持
app.get('/api/:action', async (req, res) => {
  try {
    const { action } = req.params
    const data = req.query

    const result = await callCloudFunction(action, data)

    res.json({
      code: 200,
      success: true,
      ...result
    })

  } catch (error) {
    res.status(500).json({
      code: 500,
      success: false,
      message: error.message
    })
  }
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 启动服务器
app.listen(PORT, () => {
  console.log('\n========================================')
  console.log(`  Admin API Server 已启动`)
  console.log(`  地址: http://localhost:${PORT}`)
  console.log(`  健康检查: http://localhost:${PORT}/health`)
  console.log('========================================\n')

  if (!SECRET_ID || !SECRET_KEY) {
    console.log('⚠️  WARNING: 未配置 SECRET_ID / SECRET_KEY')
    console.log('   当前模式: 模拟数据模式（不会真正操作数据库）')
    console.log('')
    console.log('   要启用真实数据库功能:')
    console.log('   1. 创建 .env 文件')
    console.log('   2. 添加以下内容:')
    console.log('      SECRET_ID=你的SecretId')
    console.log('      SECRET_KEY=你的SecretKey')
    console.log('')
    console.log('   获取方式: 腾讯云控制台 → 访问管理 → API密钥管理')
    console.log('========================================\n')
  }
})
