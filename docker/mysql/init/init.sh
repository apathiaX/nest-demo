#!/bin/bash

# MySQL 初始化脚本
# 在数据库首次启动时执行

echo "Initializing MySQL database..."

# 创建数据库和用户的语句已经通过环境变量配置
# 这里可以添加额外的初始化 SQL

# 示例: 创建额外的数据库配置
# mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<-EOSQL
#     -- 添加自定义配置
#     SET GLOBAL max_connections = 1000;
# EOSQL

echo "MySQL initialization completed."

