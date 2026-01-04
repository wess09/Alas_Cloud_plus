# FastAPI 用户管理系统 - 后端

基于 FastAPI 的前后端分离用户管理系统后端实现。

## 功能特性

- 🔐 **双角色系统**：管理员和普通用户
- 👥 **用户管理**：完整的用户 CRUD 操作
- 🖥️ **实例管理**：实例数据的创建、编辑、删除
- 🔑 **权限控制**：基于 JWT 的认证和基于角色的授权
- 📝 **完整文档**：自动生成的 Swagger 和 ReDoc 文档

## 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用入口
│   ├── config.py            # 配置文件
│   ├── database.py          # 数据库连接
│   ├── models/              # SQLAlchemy 模型
│   │   ├── __init__.py
│   │   ├── user.py          # 用户模型
│   │   ├── instance.py      # 实例模型
│   │   └── user_instance.py # 关联模型
│   ├── schemas/             # Pydantic 模式
│   │   ├── __init__.py
│   │   ├── auth.py          # 认证模式
│   │   ├── user.py          # 用户模式
│   │   └── instance.py      # 实例模式
│   ├── api/                 # API 路由
│   │   ├── __init__.py
│   │   ├── auth.py          # 认证接口
│   │   ├── admin.py         # 管理员接口
│   │   └── user.py          # 用户接口
│   └── core/                # 核心功能
│       ├── __init__.py
│       ├── security.py      # 密码加密、JWT
│       └── deps.py          # 依赖注入
├── init_db.py               # 数据库初始化脚本
├── requirements.txt         # Python 依赖
├── .env.example             # 环境变量示例
├── .gitignore
└── README.md                # 本文件
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
copy .env.example .env
```

**重要**：生产环境请修改 `SECRET_KEY` 为随机字符串！

### 3. 初始化数据库

```bash
python init_db.py
```

这将创建数据库表并初始化以下数据：

- **管理员账号**：`admin` / `Admin@114514`
- **测试用户**：`testuser` / `Test@123`
- **示例实例**：3 个示例实例

### 4. 启动服务

```bash
# 开发模式（自动重载）
python -m app.main

# 或使用 uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务将在 `http://localhost:8000` 启动

### 5. 访问文档

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## API 接口

### 认证接口

#### POST `/api/auth/login` - 用户登录

**请求体**：

```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

**响应**：

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

#### POST `/api/auth/refresh` - 刷新令牌

**请求体**：

```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 管理员接口

所有管理员接口需要在请求头中携带 `Authorization: Bearer {access_token}`

#### 用户管理

- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/users/{user_id}` - 获取用户详情
- `POST /api/admin/users` - 创建用户
- `PUT /api/admin/users/{user_id}` - 更新用户
- `DELETE /api/admin/users/{user_id}` - 删除用户

**创建用户示例**：

```json
{
  "username": "newuser",
  "password": "Password123",
  "role": "user"
}
```

#### 实例管理

- `GET /api/admin/instances` - 获取实例列表
- `GET /api/admin/instances/{instance_id}` - 获取实例详情
- `POST /api/admin/instances` - 创建实例
- `PUT /api/admin/instances/{instance_id}` - 更新实例
- `DELETE /api/admin/instances/{instance_id}` - 删除实例

**创建实例示例**：

```json
{
  "name": "生产环境",
  "url": "https://prod.example.com",
  "description": "生产环境实例"
}
```

#### 权限管理

- `POST /api/admin/users/{user_id}/instances` - 为用户分配实例
- `DELETE /api/admin/users/{user_id}/instances/{instance_id}` - 取消实例访问

**分配实例示例**：

```json
{
  "instance_ids": [1, 2, 3]
}
```

### 用户接口

所有用户接口需要在请求头中携带 `Authorization: Bearer {access_token}`

- `GET /api/user/profile` - 获取个人信息
- `GET /api/user/instances` - 获取可访问的实例列表
- `PUT /api/user/password` - 修改密码

**修改密码示例**：

```json
{
  "old_password": "OldPassword123",
  "new_password": "NewPassword456"
}
```

## 前端集成

### 1. 登录流程

```javascript
// 登录
const response = await fetch("http://localhost:8000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "Admin@123" }),
});

const data = await response.json();
// 保存 token
localStorage.setItem("access_token", data.access_token);
localStorage.setItem("refresh_token", data.refresh_token);
```

### 2. 发起认证请求

```javascript
const token = localStorage.getItem("access_token");

const response = await fetch("http://localhost:8000/api/user/profile", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### 3. 处理 Token 过期

当收到 401 状态码时，使用 refresh_token 刷新：

```javascript
const refreshResponse = await fetch("http://localhost:8000/api/auth/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    refresh_token: localStorage.getItem("refresh_token"),
  }),
});

const newTokens = await refreshResponse.json();
localStorage.setItem("access_token", newTokens.access_token);
localStorage.setItem("refresh_token", newTokens.refresh_token);
```

## 数据库

默认使用 SQLite 数据库，数据库文件为 `app.db`

### 切换到 PostgreSQL（生产推荐）

1. 安装依赖：

```bash
pip install psycopg2-binary
```

2. 修改 `.env` 中的 `DATABASE_URL`：

```
DATABASE_URL=postgresql://user:password@localhost/dbname
```

## 安全建议

1. ✅ 生产环境必须修改 `SECRET_KEY` 为随机字符串
2. ✅ 首次登录后立即修改默认管理员密码
3. ✅ 使用 HTTPS 部署
4. ✅ 配置适当的 CORS 源
5. ✅ 使用强密码策略
6. ✅ 定期更新依赖包

## 部署

### 使用 Uvicorn

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 使用 Gunicorn + Uvicorn

```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 故障排除

### 数据库连接错误

确保已运行 `python init_db.py` 初始化数据库

### CORS 错误

检查 `.env` 中的 `CORS_ORIGINS` 是否包含前端地址

### Token 验证失败

确保请求头格式为：`Authorization: Bearer {token}`

## 技术栈

- **FastAPI** - 现代、高性能的 Web 框架
- **SQLAlchemy** - Python SQL 工具包和 ORM
- **Pydantic** - 数据验证和设置管理
- **python-jose** - JWT 编码和解码
- **passlib** - 密码哈希库

## 开发

### 添加新的 API 接口

1. 在 `app/schemas/` 中定义请求/响应模型
2. 在 `app/api/` 对应的路由文件中添加端点
3. 访问 `/api/docs` 查看自动生成的文档

### 数据库迁移

如需修改模型，建议使用 Alembic 进行数据库迁移：

```bash
pip install alembic
alembic init alembic
# 配置并创建迁移脚本
```

## License

MIT
