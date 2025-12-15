---
title: scrabg 初体验（一）
published: 2025-12-15
description: '基于 Scrapy-Redis 的可扩展分布式爬虫实践笔记'
image: ''
tags: ['mysql','redis','scrabg']
category: 'scrabg'
draft: false 
lang: ''
---

# Scrapy-Redis 分布式爬虫系统实践笔记

这是我用 Scrapy-Redis 打造分布式爬虫的第一版实践，目标是：任务既能由配置文件驱动，也能从 MySQL 拉取后推到 Redis 调度，最终结果写回 MySQL。源码在 GitHub：<https://github.com/bgspiders/scrabg>。

## 功能特性

- ✅ Scrapy-Redis 架构，天然支持分布式
- ✅ JSON 配置驱动任务，开箱即用
- ✅ 支持从 MySQL 读取任务并推送到 Redis
- ✅ 仅请求模式（不解析，直接存响应）
- ✅ 结果自动写入 MySQL
- ✅ 可扩展的 workflow，便于自定义步骤

## 12/15：核心爬虫逻辑更新

最近把「配置驱动爬虫」与「仅请求爬虫」的核心代码整理了一版，细节可见文章：<https://blog.bgspider.com/posts/scrabg初体验(一)/>。核心思路：

- 启动阶段：从 `.env` 或命令行读取配置，初始化 Redis/MySQL 连接，加载 `CONFIG_PATH`。
- 请求生成：`config_request_producer.py` 把 `demo.json` 的初始请求推到 `fetch_spider:start_urls`。
- 爬虫执行：`fetch_spider` 仅发送请求，不做解析，原样把响应入队 `fetch_spider:success`。
- 工作流推进：`success_worker.py` 根据 `workflowSteps` 逐步执行 `request -> link_extraction -> data_extraction`，并将新请求或数据继续入队。
- 落库：`pipelines.py` 把最终数据写入 MySQL 的 `articles` 表。

关键代码片段（摘自 `crawler/utils/workflow.py`），展示如何根据步骤类型分发处理：

```python
def run_workflow_step(step_type, step_config, response, context):
    if step_type == "request":
        return make_next_request(step_config, response, context)
    if step_type == "link_extraction":
        links = extract_links(step_config, response)
        return enqueue_links(links, context)
    if step_type == "data_extraction":
        item = extract_data(step_config, response)
        return persist_item(item, context)
    raise ValueError(f"Unknown step type: {step_type}")
```

这样拆分后，新增步骤类型时只需在 `workflow.py` 增加分支与实现，整体流程保持解耦。

## 项目结构

```
scrabg/
├── crawler/                    # Scrapy 爬虫项目
│   ├── __init__.py
│   ├── items.py               # 数据项定义
│   ├── pipelines.py           # MySQL 数据管道
│   ├── settings.py            # Scrapy 配置
│   ├── spiders/               # 爬虫文件
│   │   ├── __init__.py
│   │   ├── config_spider.py   # 配置驱动爬虫
│   │   └── fetch_spider.py    # 仅请求爬虫
│   └── utils/                 # 工具模块
│       ├── __init__.py
│       ├── config_loader.py   # 配置加载器
│       ├── env_loader.py      # 环境变量加载器（.env 文件支持）
│       └── workflow.py        # 工作流执行器（Scrapy 内部使用）
├── .env.example               # 环境变量配置示例文件
├── demo.json                  # 示例配置文件
├── config_request_producer.py # 根据 demo.json 生成初始请求
├── success_worker.py          # 解析成功队列并推进 workflow
├── producer_push_from_mysql.py # MySQL 任务推送脚本（可选）
├── requirements.txt           # Python 依赖
├── scrapy.cfg                 # Scrapy 项目配置
├── test_setup.py              # 环境测试脚本
├── test_data.sql              # 测试数据 SQL
└── README.md                  # 本文档
```

## 环境要求与准备

- Python 3.8+
- Redis 服务器
- MySQL 5.7+ 或 MariaDB 10.3+

## 快速开始（10 分钟跑通）

### 1. 创建虚拟环境

```bash
# 创建虚拟环境（示例名 scrabgs）
python3 -m venv scrabgs

# 激活虚拟环境
# macOS/Linux:
source scrabgs/bin/activate
# Windows:
# scrabgs\Scripts\activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

**推荐：使用 .env 文件**

```bash
cp .env.example .env
# 按需修改 .env 中的配置
```

关键字段示例：

```bash
# Redis 配置
REDIS_URL=redis://localhost:6379/0

# MySQL 配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_username
MYSQL_PASSWORD=your_password
MYSQL_DB=your_database
MYSQL_CHARSET=utf8mb4

# Scrapy 配置（可选）
CONFIG_PATH=demo.json
LOG_LEVEL=INFO

# 队列键名（可选）
SCRAPY_START_KEY=fetch_spider:start_urls
SUCCESS_QUEUE_KEY=fetch_spider:success
```

**注意：** `.env` 已加入 `.gitignore`。

**密码提示：**
- Redis 密码：写在 `REDIS_URL` 中，格式 `redis://:password@host:port/db`
- MySQL 密码含特殊字符时用引号包裹

**备选：直接设置环境变量**

```bash
export REDIS_URL="redis://localhost:6379/0"
export MYSQL_HOST="localhost"
export MYSQL_PORT="3306"
export MYSQL_USER="your_username"
export MYSQL_PASSWORD="your_password"
export MYSQL_DB="your_database"
export CONFIG_PATH="demo.json"
export LOG_LEVEL="INFO"
```

### 4. 准备数据库（建表 & 测试数据）

#### 4.1 创建数据表

```sql
-- 用于保存爬取结果
CREATE TABLE articles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_id VARCHAR(32),
    title TEXT,
    link TEXT,
    content LONGTEXT,
    source_url TEXT,
    extra JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用于存储待抓取请求（用于 fetch_spider）
CREATE TABLE pending_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    url TEXT NOT NULL,
    method VARCHAR(10) DEFAULT 'GET',
    headers_json TEXT,
    params_json TEXT,
    meta_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 4.2 插入测试数据（可选）

```sql
INSERT INTO pending_requests (url, method, headers_json, meta_json) VALUES
('https://news.bjx.com.cn/yw/', 'GET', '{"User-Agent": "Mozilla/5.0"}', '{"test": true}');
```

### 5. 启动 Redis

```bash
redis-cli ping
# 期望返回: PONG
```

## 三种使用方式

### 方式一：配置驱动爬虫（config_spider）

```bash
source scrabgs/bin/activate
scrapy crawl config_spider
# 或指定配置文件路径
scrapy crawl config_spider -s CONFIG_PATH=/path/to/config.json
```

流程：
1. 读取 `demo.json`
2. 根据 `taskInfo.baseUrl` 生成初始请求
3. 按 `workflowSteps` 顺序执行：
   - `request`: 发送 HTTP 请求
   - `link_extraction`: 提取链接
   - `data_extraction`: 提取数据
4. 将数据写入 MySQL `articles`

### 方式二：MySQL 任务推送 + 仅请求爬虫（fetch_spider）

Scrapy 只负责请求与回写，解析可交给后续流程。

```bash
source scrabgs/bin/activate
python producer_push_from_mysql.py
scrapy crawl fetch_spider
```

流程：
1. `producer_push_from_mysql.py` 从 `pending_requests` 取任务并写入 `fetch_spider:start_urls`
2. `fetch_spider` 消费请求，发送 HTTP 请求
3. 响应写入 `fetch_spider:success`
4. 解析可由后续程序完成

### 方式三：demo.json 驱动 + 全链路 Redis

1. 推送初始请求
   ```bash
   source scrabgs/bin/activate
   python config_request_producer.py
   ```
2. Scrapy 仅请求
   ```bash
   scrapy crawl fetch_spider -L INFO
   ```
3. `success_worker` 解析 workflow
   ```bash
   python success_worker.py
   ```
   - `request`：直接推进下一步
   - `link_extraction`：抽取链接/标题，推送新请求并更新 `workflow_index`
   - `data_extraction`：抽取数据写入 `SUCCESS_ITEM_KEY`，并执行 `nextRequestCustomCode` 生成更多请求
4. 队列为空视为完成，可从 `SUCCESS_ITEM_KEY` 读结果，或在 `SUCCESS_ERROR_KEY` 查看失败记录

> 若需持久化结果，可编写消费者从 `SUCCESS_ITEM_KEY` 读出并写入数据库或消息队列。

## 配置说明

### .env 文件配置

项目默认读取根目录 `.env`，若同名环境变量存在则优先使用。

**配置优先级：**
1. 系统环境变量
2. `.env` 文件
3. 代码默认值

**主要配置项：**

| 配置项 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `REDIS_URL` | Redis 连接 URL | `redis://localhost:6379/0` | 否 |
| `MYSQL_HOST` | MySQL 主机地址 | `localhost` | 否 |
| `MYSQL_PORT` | MySQL 端口 | `3306` | 否 |
| `MYSQL_USER` | MySQL 用户名 | - | 是 |
| `MYSQL_PASSWORD` | MySQL 密码 | - | 是 |
| `MYSQL_DB` | MySQL 数据库名 | - | 是 |
| `MYSQL_CHARSET` | MySQL 字符集 | `utf8mb4` | 否 |
| `MYSQL_POOL_SIZE` | 连接池大小 | `5` | 否 |
| `MYSQL_POOL_MAX_OVERFLOW` | 连接池最大溢出 | `5` | 否 |
| `CONFIG_PATH` | 配置文件路径 | `demo.json` | 否 |
| `LOG_LEVEL` | 日志级别 | `INFO` | 否 |
| `SCRAPY_START_KEY` | Scrapy 启动队列键 | `fetch_spider:start_urls` | 否 |
| `SUCCESS_QUEUE_KEY` | 成功队列键 | `fetch_spider:success` | 否 |
| `SUCCESS_ITEM_KEY` | 数据结果队列键 | `fetch_spider:data_items` | 否 |
| `SUCCESS_ERROR_KEY` | 错误队列键 | `fetch_spider:errors` | 否 |

## 测试项目

### 测试脚本

用一条命令验证环境和依赖：

```bash
source scrabgs/bin/activate
# 确保已准备 .env 或直接设置环境变量
python test_setup.py
```

脚本会检查：
- ✅ 依赖包安装
- ✅ Redis 连接
- ✅ MySQL 连接
- ✅ 配置文件可读
- ✅ 数据表存在
- ✅ Redis 队列可用

### 手动测试步骤

#### 1. 测试 Redis 连接

```bash
source scrabgs/bin/activate
python -c "from redis import Redis; r = Redis.from_url('redis://localhost:6379/0'); print('Redis连接成功:', r.ping())"
```

#### 2. 测试 MySQL 连接

```bash
source scrabgs/bin/activate
python -c "
import os
os.environ['MYSQL_USER'] = 'your_user'
os.environ['MYSQL_PASSWORD'] = 'your_password'
os.environ['MYSQL_DB'] = 'your_db'
from sqlalchemy import create_engine, text
engine = create_engine(f'mysql+pymysql://{os.environ['"'"'MYSQL_USER'"'"']}:{os.environ['"'"'MYSQL_PASSWORD'"'"']}@localhost/{os.environ['"'"'MYSQL_DB'"'"']}')
with engine.connect() as conn:
    result = conn.execute(text('SELECT 1'))
    print('MySQL连接成功:', result.fetchone())
"
```

#### 3. 测试配置加载

```bash
source scrabgs/bin/activate
python -c "
from crawler.utils.config_loader import load_config
config = load_config('demo.json')
print('配置加载成功')
print('任务名称:', config['"'"'taskInfo'"'"']['"'"'name'"'"'])
print('工作流步骤数:', len(config['"'"'workflowSteps'"'"']))
"
```

#### 4. 测试推送任务到 Redis

```bash
source scrabgs/bin/activate
python producer_push_from_mysql.py
redis-cli LLEN fetch_spider:start_urls
```

#### 5. 测试爬虫运行

```bash
source scrabgs/bin/activate
scrapy crawl config_spider -L INFO
scrapy crawl fetch_spider -L INFO
```

#### 6. 验证数据保存

```sql
SELECT * FROM articles ORDER BY created_at DESC LIMIT 10;
redis-cli LRANGE fetch_spider:success 0 9
```

## 分布式部署

### 启动多个爬虫实例

在不同服务器或同一台机器的多个终端启动实例：

```bash
# 服务器 1
source scrabgs/bin/activate
scrapy crawl fetch_spider

# 服务器 2
source scrabgs/bin/activate
scrapy crawl fetch_spider

# 服务器 3
source scrabgs/bin/activate
scrapy crawl fetch_spider
```

所有实例会从同一个 Redis 队列消费任务，实现水平扩展。

### 监控队列状态

```bash
redis-cli LLEN fetch_spider:start_urls
redis-cli LLEN fetch_spider:success
redis-cli SCARD fetch_spider:dupefilter
```

## 配置说明

### demo.json 配置结构

- `taskInfo`: id / name / baseUrl / concurrency / requestInterval
- `workflowSteps`: 工作流步骤数组
  - `type`: 步骤类型（`request` / `link_extraction` / `data_extraction`）
  - `config`: 步骤配置
  - `timeout`: 超时时间
  - `retryCount`: 重试次数

## 常见问题

### 1. Redis 连接失败
- 确认 Redis 进程是否启动：`redis-cli ping`
- 检查 `REDIS_URL` 是否正确
- 排查防火墙或网络限制

### 2. MySQL 连接失败
- 确认 MySQL 服务状态
- 校验用户名、密码、数据库名
- 检查用户权限与白名单

### 3. 爬虫不工作
- 查看 Redis 队列是否有任务：`redis-cli LLEN fetch_spider:start_urls`
- 提升日志级别排查：`scrapy crawl fetch_spider -L DEBUG`
- 检查配置文件格式与必填字段

### 4. 数据未保存到 MySQL
- 检查 `ITEM_PIPELINES` 配置是否生效
- 核对 MySQL 表结构
- 查看 Scrapy 日志中的报错

## 开发扩展

### 添加新的工作流步骤类型
1. 在 `crawler/utils/workflow.py` 增加新的步骤逻辑
2. 在 `demo.json` 中声明该步骤类型

### 自定义数据处理
1. 修改 `crawler/pipelines.py` 的 `process_item`
2. 在此加入数据清洗、转换或落库逻辑