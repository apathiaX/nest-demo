#!/bin/bash

###############################################################################
# 服务器 Docker 环境初始化脚本
# 用途: 在全新的 Ubuntu 服务器上安装 Docker 和 Docker Compose
# 使用方法: sudo bash docker-setup.sh
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then 
    log_error "请使用 sudo 运行此脚本"
    exit 1
fi

log_step "开始安装 Docker 环境"

###############################################################################
# 1. 系统更新
###############################################################################
log_step "步骤 1: 更新系统"

apt update && apt upgrade -y
log_info "系统更新完成"

###############################################################################
# 2. 安装依赖
###############################################################################
log_step "步骤 2: 安装依赖包"

apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common

log_info "依赖包安装完成"

###############################################################################
# 3. 安装 Docker
###############################################################################
log_step "步骤 3: 安装 Docker"

# 添加 Docker GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动 Docker
systemctl start docker
systemctl enable docker

DOCKER_VERSION=$(docker --version)
log_info "Docker 安装完成: $DOCKER_VERSION"

###############################################################################
# 4. 安装 Docker Compose
###############################################################################
log_step "步骤 4: 安装 Docker Compose"

# Docker Compose 已通过插件安装，创建别名
cat >> ~/.bashrc <<'EOF'
# Docker Compose alias
alias docker-compose='docker compose'
EOF

log_info "Docker Compose 已配置"

###############################################################################
# 5. 配置 Docker
###############################################################################
log_step "步骤 5: 配置 Docker"

# 创建 Docker 配置目录
mkdir -p /etc/docker

# 配置 Docker daemon
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://registry.docker-cn.com"
  ]
}
EOF

# 重启 Docker
systemctl daemon-reload
systemctl restart docker

log_info "Docker 配置完成"

###############################################################################
# 6. 配置用户权限
###############################################################################
log_step "步骤 6: 配置用户权限"

# 创建部署用户
DEPLOY_USER="deploy"

if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash $DEPLOY_USER
    log_info "创建用户: $DEPLOY_USER"
fi

# 添加用户到 docker 组
usermod -aG docker $DEPLOY_USER

log_info "用户权限配置完成"

###############################################################################
# 7. 配置防火墙
###############################################################################
log_step "步骤 7: 配置防火墙"

# 安装 ufw
apt install -y ufw

# 配置防火墙规则
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp

# 启用防火墙
ufw --force enable

log_info "防火墙配置完成"

###############################################################################
# 8. 创建应用目录
###############################################################################
log_step "步骤 8: 创建应用目录"

APP_DIR="/var/www/vibe"
mkdir -p $APP_DIR
chown -R $DEPLOY_USER:$DEPLOY_USER $APP_DIR

log_info "应用目录创建: $APP_DIR"

###############################################################################
# 完成
###############################################################################
log_step "Docker 环境配置完成!"

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}安装摘要:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "✓ Docker:         $(docker --version)"
echo -e "✓ Docker Compose: $(docker compose version)"
echo -e "✓ 部署用户:       $DEPLOY_USER"
echo -e "✓ 应用目录:       $APP_DIR"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}重要提示:${NC}"
echo -e "1. 请退出并重新登录以使用 docker 命令"
echo -e "2. 或运行: ${YELLOW}newgrp docker${NC}"
echo -e "3. 测试 Docker: ${YELLOW}docker run hello-world${NC}"

echo -e "\n${BLUE}后续步骤:${NC}"
echo -e "1. 克隆代码到 $APP_DIR"
echo -e "2. 配置 .env 文件"
echo -e "3. 运行部署脚本"

log_info "安装完成!"

