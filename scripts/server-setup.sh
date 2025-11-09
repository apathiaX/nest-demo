#!/bin/bash

# ============================================
# 服务器初始化脚本
# ============================================
# 功能：在全新服务器上安装 Docker 和 Docker Compose
# 支持：Ubuntu/Debian、CentOS/RHEL
# 使用：./server-setup.sh
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

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    
    log_info "检测到操作系统: $OS $VERSION"
}

# 安装 Docker - Ubuntu/Debian
install_docker_ubuntu() {
    log_info "开始安装 Docker (Ubuntu/Debian)..."
    
    # 更新包索引
    sudo apt-get update
    
    # 安装依赖
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加 Docker GPG 密钥
    curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 添加 Docker 仓库
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装 Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    log_success "Docker 安装完成"
}

# 安装 Docker - CentOS/RHEL
install_docker_centos() {
    log_info "开始安装 Docker (CentOS/RHEL)..."
    
    # 安装依赖
    sudo yum install -y yum-utils
    
    # 添加 Docker 仓库
    sudo yum-config-manager \
        --add-repo \
        https://download.docker.com/linux/centos/docker-ce.repo
    
    # 安装 Docker Engine
    sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    log_success "Docker 安装完成"
}

# 配置 Docker
configure_docker() {
    log_info "配置 Docker..."
    
    # 启动 Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 添加当前用户到 docker 组
    sudo usermod -aG docker $USER
    
    # 配置 Docker daemon（国内镜像加速）
    sudo mkdir -p /etc/docker
    sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.mirrors.ustc.edu.cn"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF
    
    # 重启 Docker
    sudo systemctl daemon-reload
    sudo systemctl restart docker
    
    log_success "Docker 配置完成"
}

# 主流程
main() {
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}服务器环境初始化${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    
    # 检查是否为 root 或有 sudo 权限
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        log_error "需要 root 权限或 sudo 权限"
        exit 1
    fi
    
    # 检测操作系统
    detect_os
    
    # 检查 Docker 是否已安装
    if command -v docker &> /dev/null; then
        log_info "Docker 已安装，版本: $(docker --version)"
        read -p "是否重新安装？[y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "跳过 Docker 安装"
        else
            # 根据操作系统安装 Docker
            case $OS in
                ubuntu|debian)
                    install_docker_ubuntu
                    ;;
                centos|rhel|rocky|almalinux)
                    install_docker_centos
                    ;;
                *)
                    log_error "不支持的操作系统: $OS"
                    exit 1
                    ;;
            esac
        fi
    else
        # 根据操作系统安装 Docker
        case $OS in
            ubuntu|debian)
                install_docker_ubuntu
                ;;
            centos|rhel|rocky|almalinux)
                install_docker_centos
                ;;
            *)
                log_error "不支持的操作系统: $OS"
                exit 1
                ;;
        esac
    fi
    
    # 配置 Docker
    configure_docker
    
    # 验证安装
    echo ""
    log_info "验证安装..."
    docker --version
    docker compose version
    
    echo ""
    log_success "环境初始化完成！"
    echo ""
    log_info "注意事项："
    echo "  1. 需要重新登录才能使非 root 用户执行 docker 命令"
    echo "  2. 或者执行: newgrp docker"
    echo ""
    log_info "下一步："
    echo "  1. 上传项目代码到服务器"
    echo "  2. 进入项目目录"
    echo "  3. 执行部署脚本: ./deploy.sh"
    echo ""
}

main

