const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const COLLECTIONS = {
  USERS: 'user-info',
  WITHDRAWALS: 'withdraw_records',
  CONFIG: 'manger-data',
  CHAT: 'chat_messages'
}

exports.main = async (event) => {
  let action, data

  if (event.body) {
    const parsed = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    action = parsed.action
    data = parsed.data || {}
  } else {
    action = event.action
    data = event.data || {}
  }

  console.log(`[AdminAPI] action: ${action}`, JSON.stringify(data))

  try {
    let result

    switch (action) {
      case 'getDashboardStats':
        result = await getDashboardStats()
        break
      case 'getUserGrowthStats':
        result = await getUserGrowthStats(data)
        break
      case 'getWithdrawalStats':
        result = await getWithdrawalStats(data)
        break
      case 'getUserList':
        result = await getUserList(data)
        break
      case 'getUserDetail':
        result = await getUserDetail(data)
        break
      case 'getConfig':
        result = await getConfig(data)
        break
      case 'updateConfig':
        result = await updateConfig(data)
        break
      case 'getWithdrawalList':
        result = await getWithdrawalList(data)
        break
      case 'processWithdrawal':
        result = await processWithdrawal(data)
        break
      case 'getChatMessages':
        result = await getChatMessages(data)
        break
      case 'sendReply':
        result = await sendReply(data)
        break
      default:
        return { code: 400, msg: `未知操作: ${action}` }
    }

    return { code: 200, data: result }

  } catch (error) {
    console.error(`[AdminAPI] Error (${action}):`, error)
    return { code: 500, msg: error.message || '服务器内部错误' }
  }
}

async function getDashboardStats() {
  const userCountRes = await db.collection(COLLECTIONS.USERS).count()
  const userCount = userCountRes.total

  const vipCountRes = await db.collection(COLLECTIONS.USERS)
    .where({ is_vip: true })
    .count()
  const vipCount = vipCountRes.total

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayCountRes = await db.collection(COLLECTIONS.USERS)
    .where({ created_at: _.gte(todayStart) })
    .count()
  const todayCount = todayCountRes.total

  const withdrawalCountRes = await db.collection(COLLECTIONS.WITHDRAWALS).count()
  const withdrawalCount = withdrawalCountRes.total

  const pendingWithdrawalsRes = await db.collection(COLLECTIONS.WITHDRAWALS)
    .where({ status: 1 })
    .count()
  const pendingWithdrawals = pendingWithdrawalsRes.total

  let totalIncome = 0
  let newIncTotal = 0
  let oldIncTotal = 0
  let frozenTotal = 0
  let successWithdrawalAmount = 0

  const MAX_LIMIT = 100
  let offset = 0

  while (true) {
    const batch = await db.collection(COLLECTIONS.USERS)
      .skip(offset)
      .limit(MAX_LIMIT)
      .field({ total_Inc: true, new_Inc: true, old_Inc: true, frozen_amount: true })
      .get()

    for (const user of batch.data) {
      totalIncome += parseFloat(user.total_Inc) || 0
      newIncTotal += parseFloat(user.new_Inc) || 0
      oldIncTotal += parseFloat(user.old_Inc) || 0
      frozenTotal += parseFloat(user.frozen_amount) || 0
    }

    if (batch.data.length < MAX_LIMIT) break
    offset += MAX_LIMIT
  }

  offset = 0
  while (true) {
    const batch = await db.collection(COLLECTIONS.WITHDRAWALS)
      .where({ status: 2 })
      .skip(offset)
      .limit(MAX_LIMIT)
      .field({ amount: true })
      .get()

    for (const w of batch.data) {
      successWithdrawalAmount += parseFloat(w.amount) || 0
    }

    if (batch.data.length < MAX_LIMIT) break
    offset += MAX_LIMIT
  }

  return {
    userCount,
    vipCount,
    todayCount,
    totalIncome: totalIncome.toFixed(2),
    newIncTotal: newIncTotal.toFixed(2),
    oldIncTotal: oldIncTotal.toFixed(2),
    frozenTotal: frozenTotal.toFixed(2),
    withdrawalCount,
    pendingWithdrawals,
    successWithdrawalAmount: successWithdrawalAmount.toFixed(2)
  }
}

async function getUserGrowthStats(data) {
  const days = data.days || 7
  const dates = []
  const newUsers = []
  const newVips = []

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date()
    dayStart.setDate(dayStart.getDate() - i)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dateStr = `${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`
    dates.push(dateStr)

    const userCountRes = await db.collection(COLLECTIONS.USERS)
      .where({ created_at: _.gte(dayStart).and(_.lt(dayEnd)) })
      .count()
    newUsers.push(userCountRes.total)

    const vipCountRes = await db.collection(COLLECTIONS.USERS)
      .where({
        is_vip: true,
        vip_expire_time: _.gte(dayStart)
      })
      .where({
        created_at: _.gte(dayStart).and(_.lt(dayEnd))
      })
      .count()
    newVips.push(vipCountRes.total)
  }

  return { dates, newUsers, newVips }
}

async function getWithdrawalStats(data) {
  const days = data.days || 7
  const dates = []
  const amounts = []

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date()
    dayStart.setDate(dayStart.getDate() - i)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dateStr = `${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`
    dates.push(dateStr)

    let dayTotal = 0
    const MAX_LIMIT = 100
    let offset = 0

    while (true) {
      const batch = await db.collection(COLLECTIONS.WITHDRAWALS)
        .where({
          status: 2,
          create_time: _.gte(dayStart).and(_.lt(dayEnd))
        })
        .skip(offset)
        .limit(MAX_LIMIT)
        .field({ amount: true })
        .get()

      for (const w of batch.data) {
        dayTotal += parseFloat(w.amount) || 0
      }

      if (batch.data.length < MAX_LIMIT) break
      offset += MAX_LIMIT
    }

    amounts.push(Math.round(dayTotal * 100) / 100)
  }

  return { dates, amounts }
}

async function getUserList(data) {
  const page = data.page || 1
  const pageSize = data.pageSize || 20
  const keyword = data.keyword
  const skip = (page - 1) * pageSize

  let query = db.collection(COLLECTIONS.USERS)

  if (keyword) {
    query = query.where(_.or([
      { nickname: db.RegExp({ regexp: keyword, options: 'i' }) },
      { invite_code: db.RegExp({ regexp: keyword, options: 'i' }) }
    ]))
  }

  const countRes = await (keyword
    ? db.collection(COLLECTIONS.USERS).where(_.or([
        { nickname: db.RegExp({ regexp: keyword, options: 'i' }) },
        { invite_code: db.RegExp({ regexp: keyword, options: 'i' }) }
      ])).count()
    : db.collection(COLLECTIONS.USERS).count()
  )

  const listRes = await query
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return {
    list: listRes.data,
    total: countRes.total,
    page,
    pageSize
  }
}

async function getUserDetail(data) {
  const userId = data.userId
  if (!userId) {
    throw new Error('缺少用户ID')
  }

  const userRes = await db.collection(COLLECTIONS.USERS).doc(userId).get()
  const user = userRes.data

  if (!user) {
    throw new Error('用户不存在')
  }

  const withdrawRes = await db.collection(COLLECTIONS.WITHDRAWALS)
    .where({ _openid: user._openid })
    .orderBy('create_time', 'desc')
    .limit(50)
    .get()

  return {
    user,
    withdrawals: withdrawRes.data
  }
}

async function getConfig(data) {
  const type = data.type
  if (!type) {
    throw new Error('缺少配置类型 type')
  }

  const res = await db.collection(COLLECTIONS.CONFIG)
    .where({ type })
    .limit(1)
    .get()

  if (res.data.length > 0) {
    return res.data[0]
  }

  if (type === 'commission_settings') {
    return {
      type: 'commission_settings',
      level1Rate: 10.0,
      level2Rate: 5.0,
      minCommissionAmount: 0.01,
      settlementCycle: 0,
      commissionRules: '1. 邀请好友购买VIP即可获得佣金\n2. 佣金将在订单完成后自动到账\n3. 二级代理可获得额外奖励'
    }
  }

  if (type === 'banner_settings') {
    return {
      type: 'banner_settings',
      enabled: true,
      autoplay: true,
      interval: 3,
      banners: []
    }
  }

  return null
}

async function updateConfig(data) {
  const type = data.type
  if (!type) {
    throw new Error('缺少配置类型 type')
  }

  const existingRes = await db.collection(COLLECTIONS.CONFIG)
    .where({ type })
    .limit(1)
    .get()

  const updateData = { ...data }
  delete updateData._id
  updateData.updated_at = new Date()

  if (existingRes.data.length > 0) {
    const docId = existingRes.data[0]._id
    await db.collection(COLLECTIONS.CONFIG).doc(docId).update({ data: updateData })
    return { success: true, msg: '配置已更新', _id: docId }
  } else {
    updateData.created_at = new Date()
    const addRes = await db.collection(COLLECTIONS.CONFIG).add({ data: updateData })
    return { success: true, msg: '配置已创建', _id: addRes._id }
  }
}

async function getWithdrawalList(data) {
  const status = data.status
  let query = db.collection(COLLECTIONS.WITHDRAWALS)

  if (status !== undefined && status !== null) {
    query = query.where({ status })
  }

  const MAX_LIMIT = 100
  let allData = []
  let offset = 0

  while (true) {
    const batch = await query
      .orderBy('create_time', 'desc')
      .skip(offset)
      .limit(MAX_LIMIT)
      .get()

    allData = allData.concat(batch.data)
    if (batch.data.length < MAX_LIMIT) break
    offset += MAX_LIMIT
  }

  return allData
}

async function processWithdrawal(data) {
  const { recordId, action, reason } = data

  if (!recordId) {
    throw new Error('缺少提现记录ID')
  }

  if (action === 'approve') {
    const recordRes = await db.collection(COLLECTIONS.WITHDRAWALS).doc(recordId).get()
    const record = recordRes.data

    if (!record) {
      throw new Error('提现记录不存在')
    }

    const amount = parseFloat(record.amount) || 0

    await db.collection(COLLECTIONS.WITHDRAWALS).doc(recordId).update({
      data: {
        status: 2,
        callback_time: new Date(),
        fail_reason: ''
      }
    })

    const userRes = await db.collection(COLLECTIONS.USERS)
      .where({ _openid: record._openid })
      .limit(1)
      .get()

    if (userRes.data.length > 0) {
      const user = userRes.data[0]
      const newInc = parseFloat(user.new_Inc) || 0
      const oldInc = parseFloat(user.old_Inc) || 0
      const frozenAmount = parseFloat(user.frozen_amount) || 0

      await db.collection(COLLECTIONS.USERS).doc(user._id).update({
        data: {
          new_Inc: Math.max(0, newInc - amount).toFixed(2),
          old_Inc: (oldInc + amount).toFixed(2),
          frozen_amount: Math.max(0, frozenAmount - amount).toFixed(2)
        }
      })
    }

    return { success: true, msg: '提现已通过' }

  } else if (action === 'reject') {
    const recordRes = await db.collection(COLLECTIONS.WITHDRAWALS).doc(recordId).get()
    const record = recordRes.data

    if (!record) {
      throw new Error('提现记录不存在')
    }

    const amount = parseFloat(record.amount) || 0

    await db.collection(COLLECTIONS.WITHDRAWALS).doc(recordId).update({
      data: {
        status: 3,
        callback_time: new Date(),
        fail_reason: reason || '管理员拒绝'
      }
    })

    const userRes = await db.collection(COLLECTIONS.USERS)
      .where({ _openid: record._openid })
      .limit(1)
      .get()

    if (userRes.data.length > 0) {
      const user = userRes.data[0]
      const newInc = parseFloat(user.new_Inc) || 0
      const frozenAmount = parseFloat(user.frozen_amount) || 0

      await db.collection(COLLECTIONS.USERS).doc(user._id).update({
        data: {
          new_Inc: (newInc + amount).toFixed(2),
          frozen_amount: Math.max(0, frozenAmount - amount).toFixed(2)
        }
      })
    }

    return { success: true, msg: '提现已拒绝' }

  } else {
    throw new Error(`无效操作: ${action}`)
  }
}

async function getChatMessages(data) {
  const userId = data.userId

  if (userId) {
    const res = await db.collection(COLLECTIONS.CHAT)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(100)
      .get()
    return res.data.reverse()
  }

  const MAX_LIMIT = 100
  let allData = []
  let offset = 0

  while (true) {
    const batch = await db.collection(COLLECTIONS.CHAT)
      .orderBy('created_at', 'desc')
      .skip(offset)
      .limit(MAX_LIMIT)
      .get()

    allData = allData.concat(batch.data)
    if (batch.data.length < MAX_LIMIT) break
    offset += MAX_LIMIT
  }

  return allData.reverse()
}

async function sendReply(data) {
  const { userId, content } = data

  if (!userId || !content) {
    throw new Error('缺少用户ID或回复内容')
  }

  await db.collection(COLLECTIONS.CHAT).add({
    data: {
      user_id: userId,
      sender: 'admin',
      sender_name: '客服小助手',
      content,
      created_at: new Date(),
      is_read: false
    }
  })

  return { success: true, msg: '回复已发送' }
}
