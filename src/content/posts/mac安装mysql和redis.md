---
title: mac在docker下安装mysql和redis
published: 2025-12-11
description: ''
image: ''
tags: ['mysql','redis']
category: '开发'
draft: false 
lang: ''
---

## 前置
- 已安装 Docker Desktop（未装可去官网下载安装）。
- 终端确认 Docker 正常：`docker info`。

### MySQL（8.0 示例）
1) 拉镜像：`docker pull mysql:8.0`
2) 启动容器（持久化+root 密码）
```
docker run -d --name mysql \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=YourPass! \
  -v ~/docker-data/mysql/data:/var/lib/mysql \
  -v ~/docker-data/mysql/conf.d:/etc/mysql/conf.d \
  mysql:8.0
```
- `~/docker-data/mysql/data`：持久化数据目录  
- `~/docker-data/mysql/conf.d`：自定义 .cnf 配置（可选）  
- 如需初始化库/用户：将 SQL 放到 `~/docker-data/mysql/init` 并挂载到 `/docker-entrypoint-initdb.d`
3) 连接测试  
宿主机：`mysql -h 127.0.0.1 -P 3306 -uroot -p YourPass!`  
容器内：`docker exec -it mysql mysql -uroot -p YourPass!`
4) 创建业务库与账号（示例）
```
CREATE DATABASE scrabg DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'scrabg'@'%' IDENTIFIED BY 'scrabg';
GRANT ALL PRIVILEGES ON scrabg.* TO 'scrabg'@'%';
FLUSH PRIVILEGES;
```
容器内执行：`docker exec -it mysql mysql -uroot -pYourPass! -e "<上述 SQL>"`  
或进入交互后逐条执行。

### Redis（官方稳定版）
1) 拉镜像：`docker pull redis:7`
2) 启动容器（持久化，可选密码）
```
docker run -d --name redis \
  -p 6379:6379 \
  -v ~/docker-data/redis/data:/data \
  redis:7 redis-server \
    --appendonly yes \
    --requirepass YourRedisPass!
```
- `--appendonly yes`：开启 AOF 持久化  
- 无需密码可去掉 `--requirepass`  
- 复杂配置可挂载自定义 `redis.conf`：`-v ~/docker-data/redis/redis.conf:/usr/local/etc/redis/redis.conf`，并使用 `redis-server /usr/local/etc/redis/redis.conf`
3) 连接测试  
宿主机：`redis-cli -h 127.0.0.1 -p 6379 -a YourRedisPass!`  
容器内：`docker exec -it redis redis-cli`（有密码时进入后执行 `AUTH YourRedisPass!`）

### 日常操作
- 停止：`docker stop mysql redis`
- 启动：`docker start mysql redis`
- 删除容器：`docker rm -f mysql redis`（不会删除本地持久化目录）

### 常见问题
- 端口被占用：修改 `-p` 左侧宿主机端口。
- Apple Silicon：官方镜像多架构，默认匹配；如需可加 `--platform linux/amd64`。
- 数据目录权限：容器无法写入时，可按需 `chmod -R 775 ~/docker-data/mysql ~/docker-data/redis`。