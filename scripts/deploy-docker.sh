#!/bin/bash

# ============================================
# Docker 部署脚本（支持 seed 初始化）
# ============================================

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

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

print_header() {
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 检查环境变量文件
check_env() {
    if [ ! -f .env ]; then
        log_warning ".env 文件不存在，创建默认配置..."
        
        JWT_SECRET=$(openssl rand -hex 32)
        JWT_REFRESH_SECRET=$(openssl rand -hex 32)
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
        MYSQL_PASSWORD=$(openssl rand -hex 16)
        REDIS_PASSWORD=$(openssl rand -hex 16)
        
        cat > .env << EOF
NODE_ENV=production
PORT=3000
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=vibe
MYSQL_USER=vibe_user
MYSQL_PASSWORD=$MYSQL_PASSWORD

REDIS_PASSWORD=$REDIS_PASSWORD

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

ENCRYPTION_KEY=$ENCRYPTION_KEY

ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=

ENABLE_API_DOCS=false
LOG_LEVEL=info

# Seed 初始化控制（设置为 true 可跳过 seed）
SKIP_SEED=false
EOF
        
        log_success ".env 文件已创建"
        log_warning "请根据需要修改 .env 配置"
        
        read -p "是否现在编辑 .env 文件？[y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    else
        log_success ".env 文件已存在"
    fi
}

print_header "Docker 部署（支持 Seed 初始化）"

# Step 1: 环境检查
log_info "检查 Docker 环境..."
check_docker

# Step 2: 检查配置
log_info "检查环境配置..."
check_env

# Step 3: 创建目录
print_header "创建必要目录"
mkdir -p logs uploads
log_success "目录创建完成"

# Step 4: 停止旧容器
print_header "停止旧容器"
docker-compose down --remove-orphans || true
log_success "旧容器已清理"

# Step 5: 构建镜像
print_header "构建 Docker 镜像"
log_info "开始构建..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    log_success "镜像构建成功"
else
    log_error "镜像构建失败"
    exit 1
fi

# Step 6: 启动服务
print_header "启动服务"
log_info "启动所有服务（自动执行迁移和 seed）..."
docker-compose up -d

if [ $? -eq 0 ]; then
    log_success "服务启动成功"
else
    log_error "服务启动失败"
    exit 1
fi

# Step 7: 等待应用就绪
print_header "等待应用启动"
log_info "查看启动日志（按 Ctrl+C 停止查看）..."
echo ""
log_info "日志输出："
echo "----------------------------------------"

# 跟踪日志一段时间
timeout 60 docker-compose logs -f app || true

echo "----------------------------------------"
echo ""

# Step 8: 健康检查
print_header "健康检查"

log_info "等待应用就绪..."
sleep 10

max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "应用健康检查通过"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo -n "."
    sleep 2
done

echo ""

if [ $retry_count -eq $max_retries ]; then
    log_warning "应用健康检查超时"
    log_info "查看日志: docker-compose logs app"
fi

# 显示部署信息
print_header "部署完成"

log_info "服务状态："
docker-compose ps

echo ""
log_info "服务访问信息："
echo -e "  ${GREEN}应用地址:${NC} http://localhost:3000"
echo -e "  ${GREEN}健康检查:${NC} http://localhost:3000/health"
echo -e "  ${GREEN}MySQL:${NC} localhost:3306"
echo -e "  ${GREEN}Redis:${NC} localhost:6379"

echo ""
log_info "数据库初始化："
echo -e "  ${GREEN}✓ 数据库迁移:${NC} 已自动执行"
echo -e "  ${GREEN}✓ Seed 初始化:${NC} 已自动执行"
echo -e "    - 16 个系统权限"
echo -e "    - 4 个系统角色"
echo -e "    - 角色权限关联"

echo ""
log_info "查看 seed 日志："
echo -e "  ${YELLOW}docker-compose logs app | grep -A 20 '开始初始化数据库'${NC}"

echo ""
log_info "常用命令："
echo -e "  ${YELLOW}查看日志:${NC} docker-compose logs -f app"
echo -e "  ${YELLOW}重启服务:${NC} docker-compose restart app"
echo -e "  ${YELLOW}停止服务:${NC} docker-compose down"
echo -e "  ${YELLOW}进入容器:${NC} docker-compose exec app sh"

echo ""
log_info "如需跳过 seed 初始化："
echo -e "  在 .env 文件中设置: ${YELLOW}SKIP_SEED=true${NC}"

echo ""
log_success "🎉 部署成功！"

