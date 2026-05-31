# 提示词管理系统 (Prompt Manager)

一个轻量级的 AI 提示词管理工具，支持分类、标签、搜索、变量模板、导入导出等功能。

## 技术栈

- **前端**：纯 HTML + CSS + JavaScript（无框架依赖）
- **后端**：PHP 7.4+
- **数据库**：SQLite（零配置）
- **CDN 依赖**：marked.js（Markdown）、Chart.js（图表）

## 快速开始

### 方式一：PHP 内置服务器（推荐）

```bash
cd prompt-manager
php -S localhost:8080
```

然后在浏览器中访问 `http://localhost:8080`

### 方式二：Apache / Nginx

将 `prompt-manager` 文件夹复制到 Web 根目录（如 `htdocs` 或 `www`），确保：

1. PHP 已启用 PDO SQLite 扩展（`php_pdo_sqlite`）
2. `data/` 目录可写（用于存放 SQLite 数据库文件）

### 方式三：Docker

```bash
docker run -d -p 8080:80 -v $(pwd):/var/www/html php:8.1-apache
```

## 功能特性

- **提示词 CRUD**：创建、编辑、删除（软删除+回收站）、列表/卡片视图切换
- **分类管理**：树形分类结构，支持颜色标记
- **标签系统**：多标签关联，标签云导航
- **全文搜索**：搜索标题、内容、标签名
- **变量模板**：`{{变量名|默认值}}` 语法，使用时弹窗填写
- **一键复制**：自动检测变量、记录使用次数
- **导入导出**：JSON 格式批量导入导出、Markdown 导出
- **数据仪表盘**：统计卡片、分类分布图、Top 10 排行、使用记录
- **主题切换**：深色 / 浅色主题
- **快捷键**：`Ctrl+K` 聚焦搜索，`Esc` 关闭弹窗

## 目录结构

```
prompt-manager/
├── index.html              # 前端主页面（SPA）
├── css/style.css           # 样式文件
├── js/
│   ├── app.js              # 主应用逻辑
│   ├── api.js              # API 请求封装
│   ├── promptEditor.js     # 编辑器组件
│   ├── dashboard.js        # 仪表盘
│   └── utils.js            # 工具函数
├── api/
│   ├── index.php           # API 路由入口
│   ├── prompts.php         # 提示词接口
│   ├── categories.php      # 分类接口
│   ├── tags.php            # 标签接口
│   ├── export.php          # 导出接口
│   ├── import.php          # 导入接口
│   ├── trash.php           # 回收站接口
│   └── stats.php           # 统计接口
├── includes/
│   ├── config.php          # 配置文件
│   ├── db.php              # 数据库初始化
│   └── helpers.php         # 公共函数
├── data/                   # SQLite 数据库（自动生成）
└── README.md
```

## 配置

编辑 `includes/config.php`：

- 默认使用 SQLite，数据库文件自动创建在 `data/prompts.db`
- 如需使用 MySQL，将 `DB_TYPE` 改为 `'mysql'` 并填写连接信息

## 预设数据

首次运行时自动创建以下内容：

- **分类**：写作、编程、翻译、分析、创意（含子分类）
- **标签**：GPT、Claude、通用、高效、模板 等 10 个
- **示例提示词**：12 个覆盖各分类的实用模板

## API 接口

所有接口路径以 `/api/` 开头，返回 JSON 格式：

```json
{ "success": true, "data": {}, "message": "ok" }
```

详见规格文档中的接口设计章节。
