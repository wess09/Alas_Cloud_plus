# 后端 Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖（Docker CLI 用于容器管理）
RUN apt-get update && apt-get install -y \
    docker.io \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY backend/requirements.txt ./

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./

# 暴露端口
EXPOSE 8001

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
