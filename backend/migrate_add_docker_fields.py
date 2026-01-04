"""
数据库迁移脚本 - 为 Instance 模型添加 Docker 容器相关字段

运行方式：
python migrate_add_docker_fields.py
"""
from sqlalchemy import create_engine, text
from app.config import settings

def migrate():
    """添加 Docker 容器相关字段到 instances 表"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # 检查字段是否已存在
        result = conn.execute(text("PRAGMA table_info(instances)"))
        columns = [row[1] for row in result]
        
        migrations = []
        
        if 'container_id' not in columns:
            migrations.append("ALTER TABLE instances ADD COLUMN container_id VARCHAR(100)")
        
        if 'container_name' not in columns:
            migrations.append("ALTER TABLE instances ADD COLUMN container_name VARCHAR(100)")
        
        if 'config_path' not in columns:
            migrations.append("ALTER TABLE instances ADD COLUMN config_path VARCHAR(500)")
        
        if 'host_port' not in columns:
            migrations.append("ALTER TABLE instances ADD COLUMN host_port INTEGER")
        
        if 'container_status' not in columns:
            migrations.append("ALTER TABLE instances ADD COLUMN container_status VARCHAR(50) DEFAULT 'created'")
        
        # 执行迁移
        for migration in migrations:
            print(f"执行: {migration}")
            conn.execute(text(migration))
            conn.commit()
        
        if migrations:
            print(f"\n✅ 成功添加 {len(migrations)} 个字段")
        else:
            print("✅ 所有字段已存在，无需迁移")

if __name__ == "__main__":
    print("开始数据库迁移...")
    migrate()
    print("迁移完成！")
