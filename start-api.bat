@echo off
chcp 65001 >nul 2>&1
echo ========================================
echo   Admin API Server 启动器
echo ========================================
echo.

cd /d d:\Desktop\vedo-project\video-ts\admin

echo [1/3] 检查依赖...
if not exist node_modules (
    echo       正在安装依赖...
    call npm install express cors axios
)

echo.
echo [2/3] 检查配置文件...
if not exist .env (
    echo       创建 .env 配置文件...
    echo # Admin API 配置 > .env
    echo SECRET_ID= >> .env
    echo SECRET_KEY= >> .env
    echo.
    echo       ⚠️  请编辑 .env 文件填入你的密钥！
    echo.
) else (
    echo       ✓ 配置文件已存在
)

echo.
echo [3/3] 启动服务器...
echo ========================================
echo.

node server.js

pause
