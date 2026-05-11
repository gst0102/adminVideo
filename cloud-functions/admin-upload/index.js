const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * Admin 文件上传云函数 (HTTP版本)
 * 
 * 优化内容：
 * 1. 增强HTTP请求体解析
 * 2. 添加详细的日志输出
 * 3. 完善错误处理
 * 4. 移除不必要的依赖
 */

exports.main = async (event, context) => {
  console.log('========== [AdminUpload] 收到请求 ==========')
  console.log('[AdminUpload] event类型:', typeof event)
  console.log('[AdminUpload] event keys:', Object.keys(event))
  
  let action, data

  try {
    // 兼容多种调用方式：HTTP触发器 / 云函数直接调用
    if (event.body) {
      // HTTP触发器方式
      console.log('[AdminUpload] 检测到HTTP请求体')
      console.log('[AdminUpload] body类型:', typeof event.body)
      
      let body = event.body
      
      // 如果body是字符串，尝试解析JSON
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body)
          console.log('[AdminUpload] JSON解析成功')
        } catch (parseError) {
          console.error('[AdminUpload] JSON解析失败:', parseError.message)
          return {
            code: 400,
            msg: '请求体格式错误，必须是有效的JSON'
          }
        }
      }
      
      action = body.action
      data = body.data || {}
      
    } else if (event.httpMethod) {
      // 另一种HTTP触发器格式
      console.log('[AdminUpload] 检测到httpMethod字段')
      action = event.action || event.query?.action
      data = event.data || event.body || {}
      
    } else {
      // 云函数直接调用方式
      console.log('[AdminUpload] 使用标准云函数调用方式')
      action = event.action
      data = event.data || {}
    }

    console.log(`[AdminUpload] action: ${action}`)
    console.log(`[AdminUpload] data:`, JSON.stringify(data)?.substring(0, 200))

    if (!action) {
      return { code: 400, msg: '缺少action参数' }
    }

    let result

    switch (action) {
      case 'uploadImage':
        result = await uploadImage(data)
        break
      
      case 'deleteFile':
        result = await deleteFile(data)
        break
      
      case 'test':
        result = { message: '接口测试成功', timestamp: new Date().toISOString() }
        break
      
      default:
        return { code: 400, msg: `未知操作: ${action}，支持的操作: uploadImage, deleteFile, test` }
    }

    console.log('[AdminUpload] 操作成功完成')
    return { code: 200, data: result }

  } catch (error) {
    console.error('[AdminUpload] 发生错误:')
    console.error('- 错误消息:', error.message)
    console.error('- 错误堆栈:', error.stack)
    
    return { 
      code: 500, 
      msg: error.message || '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }
}

/**
 * 上传图片到云存储
 */
async function uploadImage(params) {
  console.log('[uploadImage] 开始处理上传请求...')
  console.log('[uploadImage] 接收到的参数:', Object.keys(params))

  const { base64Data, fileName, folder = 'banner' } = params

  // 参数验证
  if (!base64Data) {
    throw new Error('缺少图片数据 (base64Data)，请确保包含图片的base64编码')
  }

  if (!fileName) {
    throw new Error('缺少文件名 (fileName)')
  }

  console.log(`[uploadImage] 文件名: ${fileName}`)
  console.log(`[uploadImage] 目标目录: ${folder}`)

  // 验证目录名称（防止路径注入）
  const allowedFolders = ['banner', 'logo', 'avatar', 'other']
  if (!allowedFolders.includes(folder)) {
    throw new Error(
      `不支持的目录: ${folder}\n` +
      `允许的目录: ${allowedFolders.join(', ')}`
    )
  }

  // 提取 base64 数据（去除 data:image/xxx;base64, 前缀）
  let base64Content = base64Data
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/)
  
  if (matches && matches[2]) {
    base64Content = matches[2]
    console.log('[uploadImage] 已移除data URL前缀')
  }

  // 获取文件扩展名
  const originalExt = fileName.split('.').pop()?.toLowerCase() || ''
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  let extension = originalExt ? `.${originalExt}` : '.png'
  
  if (!allowedExts.includes(extension)) {
    console.log(`[uploadImage] 不支持的扩展名 ${extension}，使用默认 .png`)
    extension = '.png'
  }

  // 生成唯一文件名（时间戳 + 随机数）
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const safeFileName = `${timestamp}_${random}${extension}`

  // 构建云存储路径
  const cloudPath = `${folder}/${safeFileName}`
  
  console.log(`[uploadImage] 云存储路径: ${cloudPath}`)
  console.log(`[uploadImage] Base64数据长度: ${base64Content.length} 字符`)
  console.log(`[uploadImage] 估算文件大小: ${(Buffer.byteLength(base64Content, 'base64') / 1024).toFixed(2)} KB`)

  try {
    // 将 base64 转换为 Buffer 并上传
    const buffer = Buffer.from(base64Content, 'base64')
    
    console.log(`[uploadImage] Buffer大小: ${(buffer.length / 1024).toFixed(2)} KB`)
    console.log('[uploadImage] 开始调用cloud.uploadFile...')
    
    const uploadResult = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer
    })

    console.log(`[uploadFile] ✅ 上传成功!`)
    console.log(`[uploadFile] fileID: ${uploadResult.fileID}`)

    // 获取临时访问链接
    console.log('[uploadFile] 正在获取临时访问URL...')
    const urlResult = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    })

    const tempFileURL = urlResult.fileList[0]?.tempFileURL || ''
    console.log(`[uploadFile] 临时URL: ${tempFileURL.substring(0, 50)}...`)

    return {
      success: true,
      fileID: uploadResult.fileID,
      tempFileURL: tempFileURL,
      cloudPath: cloudPath,
      fileName: safeFileName,
      folder: folder,
      message: '上传成功'
    }

  } catch (uploadError) {
    console.error('[uploadImage] ❌ 上传过程出错:')
    console.error('- 错误类型:', uploadError.name)
    console.error('- 错误代码:', uploadError.code)
    console.error('- 错误消息:', uploadError.message)
    
    // 根据错误类型提供更友好的提示
    if (uploadError.message?.includes('permission')) {
      throw new Error('云存储权限不足，请检查存储权限配置')
    } else if (uploadError.message?.includes('quota')) {
      throw new Error('云存储空间不足或配额已用尽')
    } else if (uploadError.message?.includes('file size')) {
      throw new Error('文件大小超过限制')
    } else {
      throw new Error(`上传失败: ${uploadError.message}`)
    }
  }
}

/**
 * 删除云存储文件
 */
async function deleteFile(params) {
  const { fileID } = params

  if (!fileID) {
    throw new Error('缺少文件ID (fileID)')
  }

  console.log(`[deleteFile] 准备删除文件: ${fileID}`)

  try {
    await cloud.deleteFile({
      fileList: [fileID]
    })

    console.log('[deleteFile] ✅ 删除成功')
    return {
      success: true,
      message: '删除成功'
    }

  } catch (deleteError) {
    console.error('[deleteFile] ❌ 删除失败:', deleteError.message)
    throw new Error(`删除失败: ${deleteError.message}`)
  }
}
