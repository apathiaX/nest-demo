#!/bin/bash

# ============================================
# 项目更新脚本
# ============================================
# 功能：拉取最新代码并重新部署
# 使用：./update.sh
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
}

# 脚本目录和项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

print_header "项目更新"

# 检查是否为 Git 仓库
if [ ! -d .git ]; then
    log_error "当前目录不是 Git 仓库"
    exit 1
fi

print_header "Step 1: 备份当前数据"

log_info "是否在更新前备份数据？"
read -p "备份数据? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        bash "$SCRIPT_DIR/backup.sh"
    else
        log_warning "备份脚本不存在，跳过备份"
    fi
else
    log_warning "跳过备份"
fi

print_header "Step 2: 拉取最新代码"

log_info "当前分支: $(git branch --show-current)"
log_info "拉取最新代码..."

git fetch origin
git pull origin $(git branch --show-current)

if [ $? -eq 0 ]; then
    log_success "代码更新成功"
else
    log_error "代码更新失败"
    exit 1
fi

print_header "Step 3: 检查配置变化"

# 检查是否有新的环境变量
if [ -f .env.example ]; then
    log_info "检查 .env.example 是否有新增配置..."
    # 这里可以添加更复杂的配置检查逻辑
    log_warning "请检查 .env 文件是否需要添加新的配置项"
fi

print_header "Step 4: 重新构建镜像"

log_info "重新构建 Docker 镜像..."
docker compose build --no-cache

if [ $? -eq 0 ]; then
    log_success "镜像构建成功"
else
    log_error "镜像构建失败"
    exit 1
fi

print_header "Step 5: 重启服务"

log_info "重启服务..."
docker compose up -d

if [ $? -eq 0 ]; then
    log_success "服务重启成功"
else
    log_error "服务重启失败"
    exit 1
fi

print_header "Step 6: 等待服务就绪"

log_info "等待服务启动..."
sleep 10

print_header "Step 7: 执行数据库迁移"

log_info "检查是否有新的数据库迁移..."
docker compose exec -T app pnpm run prisma:migrate:deploy

if [ $? -eq 0 ]; then
    log_success "数据库迁移完成"
else
    log_error "数据库迁移失败"
    log_warning "服务可能无法正常运行，请检查日志"
fi

print_header "Step 8: 健康检查"

log_info "执行健康检查..."
sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_success "应用健康检查通过"
else
    log_error "应用健康检查失败 (HTTP $HTTP_CODE)"
    log_warning "请检查应用日志: docker compose logs -f app"
fi

print_header "更新完成"

# 显示服务状态
log_info "当前服务状态："
docker compose ps

echo ""
log_info "查看日志: docker compose logs -f"
log_info "健康检查: curl http://localhost:3000/health"

echo ""
log_success "🎉 更新完成！"

