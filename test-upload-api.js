/**
 * admin-upload 接口测试脚本
 * 
 * 使用方法：
 * 1. 在浏览器控制台运行此代码（F12 → Console）
 * 2. 或者在 Admin 页面的控制台运行
 * 
 * 测试内容：
 * - 接口是否可达
 * - 基础请求格式是否正确
 * - 错误处理是否正常
 */

const UPLOAD_URL = 'https://cloud1-0gnyce4y6d0e6caa-1403550175.ap-shanghai.app.tcloudbase.com/admin-upload'

console.log('🚀 开始测试 admin-upload 接口...')
console.log('📡 接口地址:', UPLOAD_URL)
console.log('')

// ========== 测试1: 基础连通性测试 ==========
async function testConnection() {
  console.log('📋 测试1: 基础连通性测试')
  console.log('-'.repeat(50))
  
  try {
    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'test',
        data: {}
      })
    })

    console.log('✅ HTTP状态码:', response.status)
    console.log('✅ 状态文本:', response.statusText)
    
    const result = await response.json()
    console.log('✅ 响应数据:', JSON.stringify(result, null, 2))
    
    if (response.status === 200 || result.code === 400) {
      console.log('🎉 接口连通性正常！')
      return true
    } else {
      console.log('⚠️ 接口返回异常状态')
      return false
    }
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message)
    console.error('')
    console.error('可能的原因:')
    console.error('1. 网络连接问题')
    console.error('2. HTTP访问服务未开启')
    console.error('3. 云函数未部署')
    console.error('4. URL地址错误')
    return false
  }
}

// ========== 测试2: 模拟图片上传（使用小测试图） ==========
async function testUpload() {
  console.log('')
  console.log('📋 测试2: 图片上传功能测试')
  console.log('-'.repeat(50))
  
  try {
    // 创建一个简单的1x1像素PNG图片的base64
    // 这是一个最小的有效PNG文件
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    
    console.log('🖼️ 准备上传测试图片...')
    console.log('   Base64长度:', testImageBase64.length, '字符')
    
    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'uploadImage',
        data: {
          base64Data: testImageBase64,
          fileName: 'test-image.png',
          folder: 'banner'
        }
      })
    })

    console.log('✅ HTTP状态码:', response.status)
    
    const result = await response.json()
    console.log('✅ 完整响应:', JSON.stringify(result, null, 2))

    if (result.code === 200 && result.data?.success) {
      console.log('')
      console.log('🎉 上传成功！')
      console.log('   FileID:', result.data.fileID)
      console.log('   临时URL:', result.data.tempFileURL)
      console.log('   存储路径:', result.data.cloudPath)
      return true
    } else {
      console.error('')
      console.error('❌ 上传失败:', result.msg || '未知错误')
      
      if (result.code === 500) {
        console.error('')
        console.error('错误详情分析:')
        if (result.msg?.includes('缺少')) {
          console.error('- 参数缺失，检查请求体格式')
        } else if (result.msg?.includes('上传')) {
          console.error('- 云存储操作失败')
          console.error('- 可能原因：云存储权限不足、存储空间满等')
        } else {
          console.error('- 其他服务器错误，请查看云函数日志')
        }
      }
      
      return false
    }
    
  } catch (error) {
    console.error('❌ 上传请求失败:', error.message)
    return false
  }
}

// ========== 执行所有测试 ==========
async function runAllTests() {
  console.log('╔' + '═'.repeat(60) + '╗')
  console.log('║' + '  admin-upload 接口完整测试工具  '.padStart(30).padEnd(30) + '║')
  console.log('╚' + '═'.repeat(60) + '╝')
  console.log('')
  
  const connectionOk = await testConnection()
  
  if (connectionOk) {
    await testUpload()
  }
  
  console.log('')
  console.log('=' .repeat(60))
  console.log('🏁 测试完成！')
  console.log('')
  console.log('💡 如果所有测试通过，说明接口配置正确')
  console.log('💡 如果有失败，请根据提示信息排查问题')
}

// 自动执行测试
runAllTests()
