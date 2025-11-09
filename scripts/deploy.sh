#!/bin/bash

# ============================================
# NestJS 项目服务器部署脚本
# ============================================
# 功能：完整的项目部署流程，包括环境检查、配置、构建、数据库初始化等
# 使用：./deploy.sh [环境名称]
# 示例：./deploy.sh production
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 打印标题
print_header() {
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 获取环境参数
ENV=${1:-production}
log_info "部署环境: $ENV"

# 脚本目录和项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
cd "$PROJECT_ROOT"

print_header "Step 1: 环境检查"

# 检查必需的命令
log_info "检查必需的工具..."
check_command "docker"
check_command "docker-compose"
log_success "所有必需工具已安装"

# 检查 Docker 服务状态
if ! docker info &> /dev/null; then
    log_error "Docker 服务未运行，请启动 Docker"
    exit 1
fi
log_success "Docker 服务正常运行"

print_header "Step 2: 环境配置"

# 检查 .env 文件
if [ ! -f .env ]; then
    log_warning ".env 文件不存在，创建默认配置..."
    
    # 生成随机密钥
    JWT_SECRET=$(openssl rand -hex 32)
    JWT_REFRESH_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
    MYSQL_PASSWORD=$(openssl rand -hex 16)
    REDIS_PASSWORD=$(openssl rand -hex 16)
    
    cat > .env << EOF
# ============================================
# 环境配置
# ============================================
NODE_ENV=$ENV

# ============================================
# 应用配置
# ============================================
PORT=3000
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# ============================================
# 数据库配置 - MySQL
# ============================================
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=vibe
MYSQL_USER=vibe_user
MYSQL_PASSWORD=$MYSQL_PASSWORD
DATABASE_URL=mysql://vibe_user:$MYSQL_PASSWORD@mysql:3306/vibe

# ============================================
# Redis 配置
# ============================================
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379

# ============================================
# JWT 配置
# ============================================
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ============================================
# 加密配置
# ============================================
ENCRYPTION_KEY=$ENCRYPTION_KEY

# ============================================
# 阿里云配置（可选）
# ============================================
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=

# ============================================
# API 文档配置
# ============================================
ENABLE_API_DOCS=false

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=info
EOF
    
    log_success ".env 文件已创建"
    log_warning "请编辑 .env 文件，填写必要的配置（如阿里云配置、CORS 域名等）"
    
    read -p "是否现在编辑 .env 文件？[y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-vi} .env
    fi
else
    log_success ".env 文件已存在"
fi

# 加载环境变量
source .env

print_header "Step 3: 创建必要的目录"

# 创建日志和上传目录
log_info "创建应用目录..."
mkdir -p logs uploads
chmod 755 logs uploads
log_success "目录创建完成"

print_header "Step 4: 停止旧容器"

log_info "停止并删除旧容器..."
docker-compose down --remove-orphans || true
log_success "旧容器已清理"

print_header "Step 5: 构建 Docker 镜像"

log_info "开始构建应用镜像..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    log_success "Docker 镜像构建成功"
else
    log_error "Docker 镜像构建失败"
    exit 1
fi

print_header "Step 6: 启动服务"

log_info "启动所有服务..."
docker-compose up -d

if [ $? -eq 0 ]; then
    log_success "服务启动成功"
else
    log_error "服务启动失败"
    exit 1
fi

print_header "Step 7: 等待数据库就绪"

log_info "等待 MySQL 数据库启动..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T mysql mysqladmin ping -h localhost -u$MYSQL_USER -p$MYSQL_PASSWORD &> /dev/null; then
        log_success "MySQL 数据库已就绪"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "MySQL 数据库启动超时"
    log_info "查看日志: docker-compose logs mysql"
    exit 1
fi

log_info "等待 Redis 就绪..."
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        log_success "Redis 已就绪"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Redis 启动超时"
    exit 1
fi

print_header "Step 8: 执行数据库迁移"

log_info "执行 Prisma 数据库迁移..."
docker-compose exec -T app pnpm run prisma:migrate:deploy

if [ $? -eq 0 ]; then
    log_success "数据库迁移完成"
else
    log_error "数据库迁移失败"
    log_info "查看日志: docker-compose logs app"
    exit 1
fi

print_header "Step 9: 初始化数据（可选）"

read -p "是否执行数据库种子数据初始化？[y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "执行种子数据初始化..."
    docker-compose exec -T app pnpm run prisma:seed:prod
    
    if [ $? -eq 0 ]; then
        log_success "种子数据初始化完成"
    else
        log_warning "种子数据初始化失败（可能数据已存在）"
    fi
fi

print_header "Step 10: 健康检查"

log_info "等待应用启动..."
sleep 10

log_info "检查应用健康状态..."
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "应用健康检查通过"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_warning "应用健康检查超时，请手动检查"
    log_info "查看日志: docker-compose logs app"
fi

print_header "部署完成"

# 显示服务状态
log_info "服务状态："
docker-compose ps

echo ""
log_info "服务访问信息："
echo -e "  ${GREEN}应用地址:${NC} http://localhost:3000"
echo -e "  ${GREEN}健康检查:${NC} http://localhost:3000/health"
if [ "$ENABLE_API_DOCS" = "true" ]; then
    echo -e "  ${GREEN}API 文档:${NC} http://localhost:3000/api"
fi
echo -e "  ${GREEN}MySQL:${NC} localhost:3306"
echo -e "  ${GREEN}Redis:${NC} localhost:6379"

echo ""
log_info "常用命令："
echo -e "  ${YELLOW}查看日志:${NC} docker-compose logs -f"
echo -e "  ${YELLOW}查看应用日志:${NC} docker-compose logs -f app"
echo -e "  ${YELLOW}重启服务:${NC} docker-compose restart"
echo -e "  ${YELLOW}停止服务:${NC} docker-compose down"
echo -e "  ${YELLOW}进入容器:${NC} docker-compose exec app sh"

echo ""
log_success "🎉 部署成功！"

