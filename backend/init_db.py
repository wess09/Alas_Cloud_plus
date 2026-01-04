"""
简化的数据库初始化脚本
"""

from app.database import SessionLocal, init_db, engine, Base
from app.models import User, Instance, UserInstance, UserRole
import bcrypt


def init_default_data():
    """初始化默认数据"""
    
    # 初始化数据库表
    Base.metadata.create_all(bind=engine)
    print("✓ 数据库表初始化完成")
    
    db = SessionLocal()
    
    try:
        # 检查是否已有管理员
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if existing_admin:
            print("⚠ 管理员账号已存在，跳过创建")
        else:
            # 手动使用 bcrypt 加密
            password = "admin123"
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # 创建默认管理员
            admin = User(
                username="admin",
                password_hash=password_hash,
                role=UserRole.ADMIN
            )
            db.add(admin)
            db.commit()
            print("✓ 默认管理员创建成功")
            print("  用户名: admin")
            print("  密码: admin123")
        
        # 创建示例实例
        existing_instances = db.query(Instance).count()
        if existing_instances == 0:
            instances = [
                Instance(
                    name="示例实例1",
                    url="https://example1.com",
                    description="这是第一个示例实例"
                ),
                Instance(
                    name="示例实例2",
                    url="https://example2.com",
                    description="这是第二个示例实例"
                ),
                Instance(
                    name="示例实例3",
                    url="https://example3.com",
                    description="这是第三个示例实例"
                )
            ]
            
            for instance in instances:
                db.add(instance)
            
            db.commit()
            print("✓ 示例实例创建成功（3个）")
        else:
            print("⚠ 实例数据已存在，跳过创建")
        
        # 创建示例普通用户
        existing_user = db.query(User).filter(User.username == "testuser").first()
        if not existing_user:
            password = "test123"
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            test_user = User(
                username="testuser",
                password_hash=password_hash,
                role=UserRole.USER
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            
            # 为示例用户分配实例
            instances = db.query(Instance).limit(2).all()
            for instance in instances:
                user_instance = UserInstance(
                    user_id=test_user.id,
                    instance_id=instance.id
                )
                db.add(user_instance)
            
            db.commit()
            print("✓ 示例用户创建成功")
            print("  用户名: testuser")
            print("  密码: test123")
            print(f"  已分配实例: {len(instances)}个")
        else:
            print("⚠ 示例用户已存在，跳过创建")
        
        print("\n=== 数据库初始化完成 ===")
        
    except Exception as e:
        print(f"✗ 初始化失败: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_default_data()
