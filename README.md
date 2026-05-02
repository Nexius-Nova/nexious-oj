# Nexious-OJ 在线判题平台

一个现代化的在线代码评测平台，支持多种编程语言，提供实时评测、比赛、讨论社区等功能。

## 技术栈

### 前端
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Monaco Editor (VSCode 编辑器核心)
- React Router + Zustand
- Axios

### 后端
- ExpressJS + TypeScript
- MySQL 8.0 + Redis
- JWT 认证
- Bull 消息队列

## 项目结构

```
nexious-oj/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── components/    # 组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── pages/         # 页面
│   │   ├── store/         # 状态管理
│   │   ├── types/         # 类型定义
│   │   └── utils/         # 工具函数
│   └── ...
├── server/                 # 后端项目
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── controllers/   # 控制器
│   │   ├── middlewares/   # 中间件
│   │   ├── models/        # 数据模型
│   │   ├── routes/        # 路由
│   │   ├── services/      # 业务逻辑
│   │   └── types/         # 类型定义
│   └── ...
├── database/               # 数据库脚本
│   └── schema.sql
└── package.json
```

## 快速开始

### 环境要求
- Node.js 18+
- MySQL 8.0+
- Redis 6.0+
- pnpm

### 安装依赖

```bash
# 安装所有依赖
pnpm install:all

# 或者分别安装
cd client && pnpm install
cd ../server && pnpm install
```

### 配置环境变量

1. 复制 `server/.env.example` 为 `server/.env`
2. 修改数据库连接信息和其他配置

### 初始化数据库

```bash
mysql -u root -p < database/schema.sql
```

### 启动开发服务器

```bash
# 同时启动前后端
pnpm dev

# 或者分别启动
pnpm client  # 前端 http://localhost:5173
pnpm server  # 后端 http://localhost:3000
```

## 功能特性

### 用户系统
- ✅ 用户注册/登录
- ✅ JWT Token 认证
- ✅ 用户个人信息管理
- ✅ 用户等级与积分系统

### 题目系统
- ✅ 题目列表（分页、筛选、搜索）
- ✅ 题目详情
- ✅ 难度等级
- ✅ 测试用例管理

### 判题系统
- ✅ 代码提交
- ✅ 多语言支持（JavaScript、Python、C++、Java、Go）
- ✅ Monaco Editor 集成
- ✅ 评测状态反馈

### 比赛系统
- ✅ 比赛列表
- ✅ 比赛详情
- ✅ 参赛报名

### 社区功能
- ✅ 讨论区
- ✅ 评论系统

## API 接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/profile` - 更新个人信息

### 题目相关
- `GET /api/problems` - 获取题目列表
- `GET /api/problems/:id` - 获取题目详情
- `POST /api/problems` - 创建题目（管理员）
- `PUT /api/problems/:id` - 更新题目（管理员）
- `DELETE /api/problems/:id` - 删除题目（管理员）

### 提交相关
- `POST /api/submissions` - 提交代码
- `GET /api/submissions` - 获取提交列表
- `GET /api/submissions/:id` - 获取提交详情

## 开发规范

### Git 提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

### 代码规范
- 遵循 ESLint 规则
- 使用 Prettier 格式化
- 组件化开发
- TypeScript 严格模式

## 后续计划

- [ ] 判题沙箱系统（Docker）
- [ ] VSCode 插件开发
- [ ] 实时排行榜
- [ ] WebSocket 实时通信
- [ ] AI 辅助编程
- [ ] 代码质量分析

## 许可证

MIT License
