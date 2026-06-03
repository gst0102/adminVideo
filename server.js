const express = require('express')
const cors = require('cors')
const axios = require('axios')
const crypto = require('crypto')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const WX_SERVER_URL = process.env.WX_SERVER_URL || 'http://localhost:3000'
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ''
const APP_SECRET = process.env.APP_SECRET || 'default-secret'

function generateSignature(data, timestamp) {
  const jsonString = typeof data === 'object' ? JSON.stringify(data) : String(data)
  const rawStr = `${jsonString}${timestamp}${APP_SECRET}`
  return crypto.createHash('md5').update(rawStr).digest('hex')
}

app.all('/pc/:action', async (req, res) => {
  const { env, functionName, action, data = {} } = req.body

  if (!functionName || !action) {
    return res.status(400).json({ success: false, message: '缺少必要参数' })
  }

  try {
    if (env === 'local') {
      const response = await handleLocalRequest(functionName, action, data)
      return res.json(response)
    } else {
      const timestamp = Date.now()
      const signature = generateSignature({ functionName, action, data }, timestamp)

      const response = await axios.post(`${WX_SERVER_URL}/api/callWxFunction`, {
        functionName,
        action,
        data,
        access_token: ACCESS_TOKEN,
        timestamp,
        signature
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      })

      return res.json(response.data)
    }
  } catch (error) {
    console.error('代理请求失败:', error.message)
    res.status(500).json({ success: false, message: error.message })
  }
})

async function handleLocalRequest(functionName, action, data) {
  console.log(`[Local] ${functionName}/${action}`, JSON.stringify(data).substring(0, 200))

  switch (functionName) {
    case 'admin-api':
      return handleAdminApi(action, data)
    case 'admin-upload':
      return handleAdminUpload(action, data)
    default:
      return { success: false, message: '未知的云函数' }
  }
}

function handleAdminApi(action, data) {
  switch (action) {
    case 'getDashboard':
      return {
        success: true,
        data: {
          todayCount: Math.floor(Math.random() * 20),
          totalUsers: 156,
          totalWithdrawalAmount: 5230.50,
          totalCommission: 1850.30,
          totalAmount: 3890.00,
          vipCount: 42,
          pendingWithdrawals: Math.floor(Math.random() * 5)
        }
      }
    case 'getStats':
      return { success: true, data: { } }
    default:
      return { success: true, data: [] }
  }
}

function handleAdminUpload(action, data) {
  const { fileName } = data
  return {
    success: true,
    data: {
      url: `https://placeholder.local/${fileName}`,
      fileName
    }
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`本地代理服务器运行在 http://localhost:${PORT}`)
  console.log(`FastAPI 后端: ${FASTAPI_URL}`)
})