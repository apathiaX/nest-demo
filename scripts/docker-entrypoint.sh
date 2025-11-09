#!/bin/sh

# ============================================
# Docker 容器启动脚本
# 功能：在应用启动前执行数据库迁移和 seed 初始化
# ============================================

set -e

echo "=========================================="
echo "🚀 应用启动中..."
echo "=========================================="
echo ""

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if pnpm prisma db execute --stdin < /dev/null 2>/dev/null; then
        echo "✅ 数据库已就绪"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "   尝试 $retry_count/$max_retries..."
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ 数据库连接超时"
    exit 1
fi

echo ""

# 执行数据库迁移
echo "📊 执行数据库迁移..."
pnpm run prisma:migrate:deploy

if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移完成"
else
    echo "❌ 数据库迁移失败"
    exit 1
fi

echo ""

# 执行 seed 初始化
# 通过环境变量 SKIP_SEED 控制是否执行 seed
if [ "${SKIP_SEED}" != "true" ]; then
    echo "🌱 执行数据库 seed 初始化..."
    
    # 根据环境选择 seed 命令
    if [ "${NODE_ENV}" = "production" ]; then
        pnpm run prisma:seed:prod
    elif [ "${NODE_ENV}" = "test" ]; then
        pnpm run prisma:seed:test
    else
        pnpm run prisma:seed:dev
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ Seed 初始化完成"
    else
        echo "⚠️  Seed 初始化失败（可能数据已存在）"
        # seed 失败不阻止应用启动
    fi
else
    echo "⏭️  跳过 seed 初始化 (SKIP_SEED=true)"
fi

echo ""
echo "=========================================="
echo "✨ 启动应用..."
echo "=========================================="
echo ""

# 启动应用
exec "$@"

