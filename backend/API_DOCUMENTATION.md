# API 接口文档（供前端开发使用）

## 基础信息

- **Base URL**: `http://localhost:8000`
- **认证方式**: Bearer Token (JWT)
- **内容类型**: `application/json`

## 认证说明

除了登录和刷新令牌接口，所有其他接口都需要在请求头中携带访问令牌：

```
Authorization: Bearer {access_token}
```

## 接口列表

### 1. 认证相关

#### 1.1 用户登录

```
POST /api/auth/login
```

**请求参数**：

| 参数     | 类型   | 必填 | 说明   |
| -------- | ------ | ---- | ------ |
| username | string | 是   | 用户名 |
| password | string | 是   | 密码   |

**请求示例**：

```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

**响应示例**：

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

**状态码**：

- `200` - 登录成功
- `401` - 用户名或密码错误

---

#### 1.2 刷新令牌

```
POST /api/auth/refresh
```

**请求参数**：

| 参数          | 类型   | 必填 | 说明     |
| ------------- | ------ | ---- | -------- |
| refresh_token | string | 是   | 刷新令牌 |

**请求示例**：

```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**响应示例**：

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

**状态码**：

- `200` - 刷新成功
- `401` - 刷新令牌无效或过期

---

### 2. 用户接口（普通用户）

#### 2.1 获取个人信息

```
GET /api/user/profile
```

**请求头**：

```
Authorization: Bearer {access_token}
```

**响应示例**：

```json
{
  "id": 2,
  "username": "testuser",
  "role": "user",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:00"
}
```

**状态码**：

- `200` - 成功
- `401` - 未登录或令牌无效

---

#### 2.2 获取可访问的实例列表

```
GET /api/user/instances
```

**请求头**：

```
Authorization: Bearer {access_token}
```

**响应示例**：

```json
[
  {
    "id": 1,
    "name": "示例实例1",
    "url": "https://example1.com",
    "description": "这是第一个示例实例",
    "created_at": "2024-01-01T12:00:00",
    "updated_at": "2024-01-01T12:00:00"
  },
  {
    "id": 2,
    "name": "示例实例2",
    "url": "https://example2.com",
    "description": "这是第二个示例实例",
    "created_at": "2024-01-01T12:00:00",
    "updated_at": "2024-01-01T12:00:00"
  }
]
```

**状态码**：

- `200` - 成功
- `401` - 未登录或令牌无效

---

#### 2.3 修改密码

```
PUT /api/user/password
```

**请求头**：

```
Authorization: Bearer {access_token}
```

**请求参数**：

| 参数         | 类型   | 必填 | 说明                |
| ------------ | ------ | ---- | ------------------- |
| old_password | string | 是   | 当前密码            |
| new_password | string | 是   | 新密码（至少 6 位） |

**请求示例**：

```json
{
  "old_password": "Test@123",
  "new_password": "NewPassword456"
}
```

**响应示例**：

```json
{
  "message": "密码修改成功"
}
```

**状态码**：

- `200` - 修改成功
- `400` - 原密码错误
- `401` - 未登录或令牌无效

---

### 3. 管理员接口

> ⚠️ 以下所有接口都需要管理员权限

#### 3.1 获取用户列表

```
GET /api/admin/users?skip=0&limit=100
```

**请求头**：

```
Authorization: Bearer {access_token}
```

**查询参数**：

| 参数  | 类型 | 必填 | 默认值 | 说明             |
| ----- | ---- | ---- | ------ | ---------------- |
| skip  | int  | 否   | 0      | 跳过的记录数     |
| limit | int  | 否   | 100    | 返回的最大记录数 |

**响应示例**：

```json
[
  {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2024-01-01T12:00:00",
    "updated_at": "2024-01-01T12:00:00",
    "instance_ids": []
  },
  {
    "id": 2,
    "username": "testuser",
    "role": "user",
    "created_at": "2024-01-01T12:00:00",
    "updated_at": "2024-01-01T12:00:00",
    "instance_ids": [1, 2]
  }
]
```

**状态码**：

- `200` - 成功
- `401` - 未登录或令牌无效
- `403` - 权限不足（非管理员）

---

#### 3.2 获取用户详情

```
GET /api/admin/users/{user_id}
```

**路径参数**：

| 参数    | 类型 | 必填 | 说明    |
| ------- | ---- | ---- | ------- |
| user_id | int  | 是   | 用户 ID |

**响应示例**：

```json
{
  "id": 2,
  "username": "testuser",
  "role": "user",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:00",
  "instance_ids": [1, 2]
}
```

**状态码**：

- `200` - 成功
- `404` - 用户不存在
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.3 创建用户

```
POST /api/admin/users
```

**请求参数**：

| 参数     | 类型   | 必填 | 说明                                 |
| -------- | ------ | ---- | ------------------------------------ |
| username | string | 是   | 用户名（1-50 字符）                  |
| password | string | 是   | 密码（至少 6 位）                    |
| role     | string | 否   | 角色：`admin` 或 `user`，默认 `user` |

**请求示例**：

```json
{
  "username": "newuser",
  "password": "Password123",
  "role": "user"
}
```

**响应示例**：

```json
{
  "id": 3,
  "username": "newuser",
  "role": "user",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:00"
}
```

**状态码**：

- `201` - 创建成功
- `400` - 用户名已存在或参数错误
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.4 更新用户

```
PUT /api/admin/users/{user_id}
```

**路径参数**：

| 参数    | 类型 | 必填 | 说明    |
| ------- | ---- | ---- | ------- |
| user_id | int  | 是   | 用户 ID |

**请求参数**（所有参数均为可选）：

| 参数     | 类型   | 必填 | 说明                      |
| -------- | ------ | ---- | ------------------------- |
| username | string | 否   | 新用户名（1-50 字符）     |
| password | string | 否   | 新密码（至少 6 位）       |
| role     | string | 否   | 新角色：`admin` 或 `user` |

**请求示例**：

```json
{
  "username": "updated_user",
  "role": "admin"
}
```

**响应示例**：

```json
{
  "id": 3,
  "username": "updated_user",
  "role": "admin",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T13:00:00"
}
```

**状态码**：

- `200` - 更新成功
- `400` - 用户名已存在或参数错误
- `404` - 用户不存在
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.5 删除用户

```
DELETE /api/admin/users/{user_id}
```

**路径参数**：

| 参数    | 类型 | 必填 | 说明    |
| ------- | ---- | ---- | ------- |
| user_id | int  | 是   | 用户 ID |

**响应**：无内容

**状态码**：

- `204` - 删除成功
- `400` - 不能删除自己的账号
- `404` - 用户不存在
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.6 获取实例列表

```
GET /api/admin/instances?skip=0&limit=100
```

**查询参数**：

| 参数  | 类型 | 必填 | 默认值 | 说明             |
| ----- | ---- | ---- | ------ | ---------------- |
| skip  | int  | 否   | 0      | 跳过的记录数     |
| limit | int  | 否   | 100    | 返回的最大记录数 |

**响应示例**：

```json
[
  {
    "id": 1,
    "name": "示例实例1",
    "url": "https://example1.com",
    "description": "这是第一个示例实例",
    "created_at": "2024-01-01T12:00:00",
    "updated_at": "2024-01-01T12:00:00"
  }
]
```

**状态码**：

- `200` - 成功
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.7 获取实例详情

```
GET /api/admin/instances/{instance_id}
```

**路径参数**：

| 参数        | 类型 | 必填 | 说明    |
| ----------- | ---- | ---- | ------- |
| instance_id | int  | 是   | 实例 ID |

**响应示例**：

```json
{
  "id": 1,
  "name": "示例实例1",
  "url": "https://example1.com",
  "description": "这是第一个示例实例",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:00"
}
```

**状态码**：

- `200` - 成功
- `404` - 实例不存在
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.8 创建实例

```
POST /api/admin/instances
```

**请求参数**：

| 参数        | 类型   | 必填 | 说明                   |
| ----------- | ------ | ---- | ---------------------- |
| name        | string | 是   | 实例名称（1-100 字符） |
| url         | string | 是   | 实例 URL（1-500 字符） |
| description | string | 否   | 实例描述               |

**请求示例**：

```json
{
  "name": "生产环境",
  "url": "https://prod.example.com",
  "description": "生产环境实例"
}
```

**响应示例**：

```json
{
  "id": 4,
  "name": "生产环境",
  "url": "https://prod.example.com",
  "description": "生产环境实例",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:00"
}
```

**状态码**：

- `201` - 创建成功
- `400` - 参数错误
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.9 更新实例

```
PUT /api/admin/instances/{instance_id}
```

**路径参数**：

| 参数        | 类型 | 必填 | 说明    |
| ----------- | ---- | ---- | ------- |
| instance_id | int  | 是   | 实例 ID |

**请求参数**（所有参数均为可选）：

| 参数        | 类型   | 必填 | 说明                 |
| ----------- | ------ | ---- | -------------------- |
| name        | string | 否   | 新名称（1-100 字符） |
| url         | string | 否   | 新 URL（1-500 字符） |
| description | string | 否   | 新描述               |

**请求示例**：

```json
{
  "name": "生产环境（更新）",
  "description": "更新后的描述"
}
```

**响应示例**：

```json
{
  "id": 4,
  "name": "生产环境（更新）",
  "url": "https://prod.example.com",
  "description": "更新后的描述",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T13:00:00"
}
```

**状态码**：

- `200` - 更新成功
- `404` - 实例不存在
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.10 删除实例

```
DELETE /api/admin/instances/{instance_id}
```

**路径参数**：

| 参数        | 类型 | 必填 | 说明    |
| ----------- | ---- | ---- | ------- |
| instance_id | int  | 是   | 实例 ID |

**响应**：无内容

**状态码**：

- `204` - 删除成功
- `404` - 实例不存在
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.11 为用户分配实例

```
POST /api/admin/users/{user_id}/instances
```

**路径参数**：

| 参数    | 类型 | 必填 | 说明    |
| ------- | ---- | ---- | ------- |
| user_id | int  | 是   | 用户 ID |

**请求参数**：

| 参数         | 类型  | 必填 | 说明         |
| ------------ | ----- | ---- | ------------ |
| instance_ids | array | 是   | 实例 ID 数组 |

**请求示例**：

```json
{
  "instance_ids": [1, 2, 3]
}
```

**响应示例**：

```json
{
  "message": "实例分配成功",
  "user_id": 2,
  "instance_ids": [1, 2, 3]
}
```

**注意**：此操作会替换用户当前的所有实例权限。

**状态码**：

- `200` - 分配成功
- `400` - 部分实例 ID 不存在
- `404` - 用户不存在
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

#### 3.12 取消用户实例访问权限

```
DELETE /api/admin/users/{user_id}/instances/{instance_id}
```

**路径参数**：

| 参数        | 类型 | 必填 | 说明    |
| ----------- | ---- | ---- | ------- |
| user_id     | int  | 是   | 用户 ID |
| instance_id | int  | 是   | 实例 ID |

**响应**：无内容

**状态码**：

- `204` - 取消成功
- `404` - 用户实例关联不存在
- `401` - 未登录或令牌无效
- `403` - 权限不足

---

## 错误响应格式

所有错误响应都遵循以下格式：

```json
{
  "detail": "错误描述信息"
}
```

## 常见状态码说明

| 状态码 | 说明               |
| ------ | ------------------ |
| 200    | 请求成功           |
| 201    | 创建成功           |
| 204    | 删除成功（无内容） |
| 400    | 请求参数错误       |
| 401    | 未登录或令牌无效   |
| 403    | 权限不足           |
| 404    | 资源不存在         |
| 500    | 服务器内部错误     |

## 前端开发示例

### Axios 配置示例

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理 token 过期
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const response = await axios.post(
            "http://localhost:8000/api/auth/refresh",
            {
              refresh_token: refreshToken,
            }
          );

          const { access_token, refresh_token } = response.data;
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // 刷新失败，跳转到登录页
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 使用示例

```javascript
import api from "./api";

// 登录
async function login(username, password) {
  const response = await api.post("/api/auth/login", { username, password });
  const { access_token, refresh_token } = response.data;
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
  return response.data;
}

// 获取用户列表
async function getUsers() {
  const response = await api.get("/api/admin/users");
  return response.data;
}

// 创建用户
async function createUser(userData) {
  const response = await api.post("/api/admin/users", userData);
  return response.data;
}

// 获取实例列表
async function getUserInstances() {
  const response = await api.get("/api/user/instances");
  return response.data;
}
```

## 在线 API 文档

启动后端服务后，可以访问以下地址查看交互式 API 文档：

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

这些文档支持直接测试 API 接口。
