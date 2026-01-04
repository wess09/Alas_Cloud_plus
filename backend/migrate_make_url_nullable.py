"""
数据库迁移脚本 - 将 Instance 模型的 url 字段改为可为空

运行方式：
python migrate_make_url_nullable.py
"""
import sqlite3
import os
from app.config import settings

def migrate():
    """修改 instances 表的 structure"""
    
    # 解析数据库路径
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
        # 处理相对路径
        if db_path.startswith("./"):
            db_path = os.path.join(os.getcwd(), db_path[2:])
            
        print(f"正在连接数据库: {db_path}")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            # SQLite 不支持直接修改列的 nullable 属性
            # 需要: 1. 创建新表 2. 复制数据 3. 删除旧表 4. 重命名新表
            
            print("开始迁移...")
            
            # 1. 检查当前表结构
            cursor.execute("PRAGMA table_info(instances)")
            columns = cursor.fetchall()
            col_defs = []
            col_names = []
            
            for col in columns:
                cid, name, type_, notnull, dflt_value, pk = col
                if name == 'url':
                    # 修改 url 列定义，移除 NOT NULL
                    col_defs.append(f"{name} {type_}")
                else:
                    # 保持其他列定义不变
                    def_ = f"{name} {type_}"
                    if notnull:
                        def_ += " NOT NULL"
                    if dflt_value is not None:
                        def_ += f" DEFAULT {dflt_value}"
                    if pk:
                        def_ += " PRIMARY KEY"
                    col_defs.append(def_)
                col_names.append(name)
            
            # 获取原表的 SQL 以获取外键等约束（简单起见，这里手动重建基础结构，因为我们只改了一个字段）
            # 注意：如果使用了 alembic，这会简单很多。这里手动处理 SQLite 迁移。
            
            # 这种方式比较复杂且容易出错，鉴于 SQLite 的限制，
            # 我们可以简单地允许 NULL 值的更简单方法是：
            # 在应用层模型已经修改为 nullable=True
            # 对于 SQLite，如果我们在 Python 代码中插入 NULL，它可能还是会报错如果 schema 是 NOT NULL。
            # 但是！SQLAlchemy 在 create_all 时不会在这个字段上加 NOT NULL 约束了。
            # 对于现有数据库，我们需要放松这个约束。

            # 简化的 SQLite 迁移方案：创建一个临时表，复制数据，替换原表
            
            # 使用更安全的 ALTER TABLE 也可以，但 SQLite 对 ALTER TABLE 支持有限。
            # 我们尝试直接修改 schema 可能不可行。
            
            # 让我们使用一个更简单的方法：我们只需要修改 'url' 列。
            
            create_table_sql = f"""
            CREATE TABLE instances_new (
                id INTEGER PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                url VARCHAR(500),
                description TEXT,
                container_id VARCHAR(100),
                container_name VARCHAR(100),
                config_path VARCHAR(500),
                host_port INTEGER,
                container_status VARCHAR(50) DEFAULT 'created',
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            );
            """
            
            print("创建临时表...")
            cursor.execute(create_table_sql)
            
            print("复制数据...")
            # 动态构建列名列表
            cols = ", ".join(col_names)
            cursor.execute(f"INSERT INTO instances_new ({cols}) SELECT {cols} FROM instances")
            
            print("替换旧表...")
            cursor.execute("DROP TABLE instances")
            cursor.execute("ALTER TABLE instances_new RENAME TO instances")
            
            conn.commit()
            print("✅ 迁移成功！URL 字段现在允许为空。")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ 迁移失败: {e}")
        finally:
            conn.close()
            
    else:
        print("仅支持 SQLite 数据库的自动迁移。如果您使用的是 PostgreSQL 或其他数据库，请手动修改表结构。")
        print("SQL: ALTER TABLE instances ALTER COLUMN url DROP NOT NULL;")

if __name__ == "__main__":
    migrate()
