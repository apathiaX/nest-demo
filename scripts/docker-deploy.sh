#!/bin/bash

###############################################################################
# Docker 容器化部署脚本
# 用途: 在服务器上使用 Docker 部署应用
# 使用方法: bash docker-deploy.sh [options]
###############################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
APP_NAME="vibe-app"
APP_DIR="/var/www/vibe"
DOCKER_REGISTRY="crpi-45ouqw5ynxif03t0.cn-shanghai.personal.cr.aliyuncs.com"
DOCKER_IMAGE="vibe/vibe-server"
BACKUP_DIR="/var/backups/vibe-docker"

# 默认选项
SKIP_BACKUP=false
SKIP_MIGRATION=false
PULL_LATEST=true
REBUILD=false

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN:${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

# 显示帮助
show_help() {
    cat << EOF
Docker 容器化部署脚本

使用方法:
    bash docker-deploy.sh [options]

选项:
    -h, --help              显示帮助信息
    -b, --skip-backup       跳过备份
    -m, --skip-migration    跳过数据库迁移
    -r, --rebuild           重新构建镜像
    --no-pull               不拉取最新镜像

示例:
    bash docker-deploy.sh                    # 标准部署
    bash docker-deploy.sh --rebuild          # 重新构建
    bash docker-deploy.sh --skip-migration   # 跳过迁移

EOF
}

# 解析参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -b|--skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            -m|--skip-migration)
                SKIP_MIGRATION=true
                shift
                ;;
            -r|--rebuild)
                REBUILD=true
                shift
                ;;
            --no-pull)
                PULL_LATEST=false
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 检查环境
check_environment() {
    log_step "检查部署环境"
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "未找到 Docker"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "未找到 Docker Compose"
        exit 1
    fi
    
    # 显示版本
    log "Docker: $(docker --version)"
    log "Docker Compose: $(docker-compose --version 2>/dev/null || docker compose version)"
    
    # 检查 .env 文件
    if [ ! -f "$APP_DIR/.env" ]; then
        log_error "未找到 .env 文件"
        log_warn "请复制 .env.docker.example 为 .env 并配置"
        exit 1
    fi
    
    log "环境检查完成 ✓"
}

# 备份当前容器
backup_containers() {
    if [ "$SKIP_BACKUP" = true ]; then
        log_warn "跳过备份"
        return
    fi
    
    log_step "备份当前容器"
    
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_NAME="backup_$(date +'%Y%m%d_%H%M%S')"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    # 导出容器镜像
    if docker ps -a | grep -q "$APP_NAME"; then
        log "导出应用镜像..."
        docker save -o "$BACKUP_PATH.tar" nest-demo:latest 2>/dev/null || true
        
        # 备份数据卷
        log "备份数据卷..."
        docker run --rm \
            -v nest-demo_mysql_data:/data \
            -v "$BACKUP_DIR":/backup \
            alpine tar czf "/backup/${BACKUP_NAME}_mysql.tar.gz" /data 2>/dev/null || true
        
        docker run --rm \
            -v nest-demo_redis_data:/data \
            -v "$BACKUP_DIR":/backup \
            alpine tar czf "/backup/${BACKUP_NAME}_redis.tar.gz" /data 2>/dev/null || true
        
        log "备份完成 ✓"
    else
        log_warn "未找到运行中的容器，跳过备份"
    fi
}

# 拉取最新镜像或重新构建
update_images() {
    log_step "更新镜像"
    
    cd "$APP_DIR"
    
    if [ "$REBUILD" = true ]; then
        log "重新构建镜像..."
        docker-compose build --no-cache
    elif [ "$PULL_LATEST" = true ]; then
        log "拉取最新镜像..."
        docker-compose pull || log_warn "拉取镜像失败，将使用本地镜像"
    fi
    
    log "镜像更新完成 ✓"
}

# 运行数据库迁移
run_migration() {
    if [ "$SKIP_MIGRATION" = true ]; then
        log_warn "跳过数据库迁移"
        return
    fi
    
    log_step "运行数据库迁移"
    
    cd "$APP_DIR"
    
    # 确保数据库服务运行
    docker-compose up -d mysql
    
    # 等待数据库就绪
    log "等待数据库就绪..."
    sleep 10
    
    # 运行迁移
    log "执行数据库迁移..."
    docker-compose run --rm app pnpm run prisma:migrate:prod
    
    log "数据库迁移完成 ✓"
}

# 启动服务
start_services() {
    log_step "启动服务"
    
    cd "$APP_DIR"
    
    # 启动所有服务
    log "启动 Docker Compose 服务..."
    docker-compose up -d
    
    log "服务启动完成 ✓"
}

# 健康检查
health_check() {
    log_step "健康检查"
    
    # 等待应用启动
    log "等待应用启动..."
    sleep 15
    
    # 检查容器状态
    log "检查容器状态..."
    docker-compose ps
    
    # HTTP 健康检查
    log "执行 HTTP 健康检查..."
    MAX_RETRIES=10
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f http://localhost/health &> /dev/null; then
            log "健康检查通过 ✓"
            return 0
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_warn "健康检查失败，重试 ($RETRY_COUNT/$MAX_RETRIES)..."
        sleep 5
    done
    
    log_error "健康检查失败"
    log "查看应用日志:"
    docker-compose logs --tail=50 app
    exit 1
}

# 清理资源
cleanup() {
    log_step "清理资源"
    
    # 清理悬空镜像
    log "清理悬空镜像..."
    docker image prune -f
    
    # 清理旧容器
    log "清理停止的容器..."
    docker container prune -f
    
    # 清理旧备份 (保留最近 5 个)
    if [ -d "$BACKUP_DIR" ]; then
        log "清理旧备份..."
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -f
    fi
    
    log "清理完成 ✓"
}

# 显示部署信息
show_deployment_info() {
    log_step "部署信息"
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}部署完成!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # 显示容器状态
    docker-compose ps
    
    echo -e "\n${BLUE}常用命令:${NC}"
    echo -e "  查看日志:     ${YELLOW}docker-compose logs -f app${NC}"
    echo -e "  查看所有日志: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "  重启应用:     ${YELLOW}docker-compose restart app${NC}"
    echo -e "  停止服务:     ${YELLOW}docker-compose stop${NC}"
    echo -e "  进入容器:     ${YELLOW}docker-compose exec app sh${NC}"
    echo -e "  查看状态:     ${YELLOW}docker-compose ps${NC}"
    
    echo -e "\n${BLUE}服务访问:${NC}"
    echo -e "  应用:         ${YELLOW}http://localhost${NC}"
    echo -e "  API 文档:     ${YELLOW}http://localhost/api/docs${NC}"
    echo -e "  健康检查:     ${YELLOW}http://localhost/health${NC}"
}

# 主函数
main() {
    parse_args "$@"
    
    log_step "开始 Docker 容器化部署"
    
    check_environment
    backup_containers
    update_images
    run_migration
    start_services
    health_check
    cleanup
    show_deployment_info
    
    log_step "部署完成 ✓"
}

# 运行主函数
main "$@"

