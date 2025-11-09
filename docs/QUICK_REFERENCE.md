# 🚀 快速参考卡片

## 一键命令

```bash
# 🎯 一键部署（首次部署）
./deploy.sh production

# 🔄 更新部署
./scripts/update.sh

# 💾 备份数据
./scripts/backup.sh

# 🩺 健康检查
./scripts/health-check.sh
```

---

## Docker Compose 命令

```bash
# 查看服务状态
docker compose ps

# 查看日志（所有服务）
docker compose logs -f

# 查看应用日志
docker compose logs -f app

# 重启服务
docker compose restart

# 停止服务
docker compose stop

# 启动服务
docker compose start

# 重新构建并启动
docker compose up -d --build

# 停止并删除容器
docker compose down
```

---

## 容器操作

```bash
# 进入应用容器
docker compose exec app sh

# 进入数据库
docker compose exec mysql mysql -u vibe_user -p

# 进入 Redis
docker compose exec redis redis-cli

# 查看容器资源使用
docker stats
```

---

## 数据库操作

```bash
# 执行数据库迁移
docker compose exec app pnpm run prisma:migrate:deploy

# Prisma Studio（数据库管理界面）
docker compose exec app pnpm run prisma:studio

# 备份数据库
docker compose exec mysql mysqldump -u vibe_user -p vibe > backup.sql

# 恢复数据库
docker compose exec -T mysql mysql -u vibe_user -p vibe < backup.sql

# 查看数据库表
docker compose exec mysql mysql -u vibe_user -p -e "SHOW TABLES;" vibe
```

---

## 日志查看

```bash
# 实时日志（最近 100 行）
docker compose logs -f --tail=100 app

# 所有服务日志
docker compose logs

# 错误日志
docker compose logs app | grep -i error

# 应用日志文件
tail -f logs/application-*.log
tail -f logs/error-*.log
```

---

## 健康检查

```bash
# HTTP 健康检查
curl http://localhost:3000/health

# 完整健康检查
./scripts/health-check.sh

# 检查容器健康状态
docker compose ps

# 查看资源使用
docker stats
df -h
free -h
```

---

## 环境配置

```bash
# 编辑环境变量
nano .env

# 查看环境变量
cat .env

# 生成随机密钥
openssl rand -hex 32

# 重新加载配置（需重启）
docker compose restart
```

---

## 网络和端口

```bash
# 查看端口占用
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3306
sudo netstat -tlnp | grep :6379

# 测试端口连接
curl http://localhost:3000/health
telnet localhost 3306
```

---

## 清理和维护

```bash
# 清理未使用的 Docker 资源
docker system prune -a

# 清理旧日志（保留 7 天）
find logs/ -name "*.log" -mtime +7 -delete

# 清理旧备份（保留 7 天）
find backups/ -name "*.tar.gz" -mtime +7 -delete

# 查看磁盘使用
du -sh *
df -h
```

---

## 故障排查

```bash
# 查看所有容器状态
docker compose ps

# 查看容器详细信息
docker compose logs mysql
docker compose logs redis
docker compose logs app

# 重启服务
docker compose restart app

# 完全重启
docker compose down
docker compose up -d

# 查看 Docker 守护进程状态
sudo systemctl status docker

# 重启 Docker
sudo systemctl restart docker
```

---

## 服务端口

| 服务       | 端口    | 说明                |
| ---------- | ------- | ------------------- |
| NestJS App | 3000    | 应用主端口          |
| Nginx      | 80, 443 | HTTP/HTTPS 反向代理 |
| MySQL      | 3306    | 数据库端口          |
| Redis      | 6379    | 缓存端口            |

---

## 重要文件路径

```bash
.env                    # 环境变量配置
docker-compose.yml      # Docker Compose 配置
Dockerfile              # Docker 镜像定义
logs/                   # 应用日志目录
uploads/                # 用户上传文件
backups/                # 数据备份目录
prisma/schema.prisma    # 数据库模型定义
```

---

## 常用 Git 命令

```bash
# 查看当前分支
git branch

# 拉取最新代码
git pull origin main

# 查看状态
git status

# 查看最近提交
git log --oneline -n 10
```

---

## 定时任务示例

```bash
# 编辑定时任务
crontab -e

# 每天凌晨 2 点备份
0 2 * * * cd /path/to/nest-demo && ./scripts/backup.sh

# 每 10 分钟健康检查
*/10 * * * * cd /path/to/nest-demo && ./scripts/health-check.sh

# 每周日凌晨 3 点清理日志
0 3 * * 0 find /path/to/nest-demo/logs/ -name "*.log" -mtime +7 -delete
```

---

## 紧急恢复

```bash
# 1. 停止所有服务
docker compose down

# 2. 恢复数据库
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz
docker compose up -d mysql
sleep 10
docker compose exec -T mysql mysql -u vibe_user -p vibe < backup_YYYYMMDD_HHMMSS/database.sql

# 3. 恢复上传文件
cp -r backup_YYYYMMDD_HHMMSS/uploads/* ./uploads/

# 4. 启动所有服务
docker compose up -d
```

---

## 性能监控

```bash
# 实时容器资源监控
docker stats

# 查看磁盘 I/O
iostat -x 1

# 查看网络连接
netstat -an | grep :3000

# 查看系统负载
top
htop
```

---

## 安全检查

```bash
# 检查防火墙状态
sudo ufw status          # Ubuntu
sudo firewall-cmd --list-all  # CentOS

# 检查 SSL 证书
openssl x509 -in docker/nginx/ssl/fullchain.pem -noout -dates

# 检查开放端口
sudo ss -tulpn
```

---

## 帮助和文档

| 文件                 | 用途           |
| -------------------- | -------------- |
| `QUICKSTART.md`      | 5 分钟快速开始 |
| `DEPLOYMENT.md`      | 完整部署文档   |
| `DEPLOY_README.md`   | 部署方案总览   |
| `scripts/README.md`  | 脚本使用说明   |
| `QUICK_REFERENCE.md` | 本参考卡片     |

---

**💡 提示**: 将此文件保存到你的笔记中，方便随时查阅！
