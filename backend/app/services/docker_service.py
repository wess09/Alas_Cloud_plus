import docker
import os
import time
import yaml
import json
import subprocess
from typing import Optional, Dict, Any
from app.config import settings


class DockerService:
    """Docker 容器管理服务"""
    
    def __init__(self):
        """初始化 Docker 客户端"""
        try:
            self.client = docker.from_env()
        except Exception as e:
            raise RuntimeError(f"无法连接到 Docker: {str(e)}")
    
    def create_container(self, instance_name: str) -> Dict[str, Any]:
        """
        创建新的 ALAS 容器
        
        Args:
            instance_name: 实例名称
            
        Returns:
            dict: 包含容器信息的字典
                - container_id: 容器 ID
                - container_name: 容器名称
                - config_path: 配置文件路径
                - host_port: 主机端口（初始为 0，待 SSH 隧道建立）
                - url: 实例 URL（初始为空，待 SSH 隧道建立）
        """
        # 生成唯一的容器名（使用时间戳确保唯一性）
        timestamp = int(time.time())
        container_name = f"{settings.DOCKER_CONTAINER_PREFIX}_{timestamp}"
        
        # 配置文件路径：/home/nero/alas/{容器名}/config
        config_path = os.path.join(settings.DOCKER_BASE_PATH, container_name, "config")
        
        # 确保配置目录存在
        os.makedirs(config_path, exist_ok=True)
        
        # 预先生成 deploy.yaml，解决从镜像启动时配置不全的问题
        import shutil
        import random
        import string
        
        try:
            # 模板文件路径（假设在 backend 目录下）
            current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            template_path = os.path.join(current_dir, "deploy.template.yaml")
            target_path = os.path.join(config_path, "deploy.yaml")
            
            if os.path.exists(template_path):
                # 复制模板
                shutil.copy2(template_path, target_path)
                
                # 读取并注入 SSH 用户名
                with open(target_path, 'r', encoding='utf-8') as f:
                    config = yaml.safe_load(f) or {}
                
                # 生成随机 SSH 用户名
                timestamp_part = str(int(time.time()))[-6:] # 取时间戳后6位
                random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
                generated_ssh_user = f"alas{timestamp_part}{random_part}"
                
                # 更新配置
                if 'Deploy' not in config: config['Deploy'] = {}
                if 'RemoteAccess' not in config['Deploy']: config['Deploy']['RemoteAccess'] = {}
                
                config['Deploy']['RemoteAccess']['SSHUser'] = generated_ssh_user
                
                # 写回文件
                with open(target_path, 'w', encoding='utf-8') as f:
                    yaml.dump(config, f, allow_unicode=True)
                    
                print(f"配置文件已预生成并注入 SSHUser: {generated_ssh_user}")
            else:
                print(f"警告: 模板文件未找到: {template_path}，将跳过预生成配置")
                
        except Exception as e:
            print(f"警告: 预生成配置文件失败: {str(e)}")
        
        # 拉取最新镜像
        try:
            print(f"正在拉取镜像: {settings.DOCKER_IMAGE}")
            self.client.images.pull(settings.DOCKER_IMAGE)
        except Exception as e:
            raise RuntimeError(f"拉取镜像失败: {str(e)}")
        
        # 创建容器
        try:
            container = self.client.containers.run(
                settings.DOCKER_IMAGE,
                name=container_name,
                detach=True,
                ports={'22267/tcp': 0},  # 自动分配主机端口
                volumes={
                    '/home/nero/AzurLaneAutoScript': {'bind': '/app/AzurLaneAutoScript', 'mode': 'rw'},
                    config_path: {'bind': '/app/AzurLaneAutoScript/config', 'mode': 'rw'},
                    '/etc/localtime': {'bind': '/etc/localtime', 'mode': 'ro'}
                },
                restart_policy={"Name": "unless-stopped"}
            )
            
            # 刷新容器信息以获取分配的端口
            container.reload()
            
            # 获取分配的主机端口
            port_bindings = container.attrs['NetworkSettings']['Ports'].get('22267/tcp', [])
            host_port = int(port_bindings[0]['HostPort']) if port_bindings else 0
            
            return {
                'container_id': container.id,
                'container_name': container_name,
                'config_path': config_path,
                'host_port': host_port,
                'url': '',  # URL 将在 SSH 隧道建立后更新
                'status': 'running'
            }
        except Exception as e:
            # 如果创建失败，清理配置目录
            try:
                os.rmdir(config_path)
            except:
                pass
            raise RuntimeError(f"创建容器失败: {str(e)}")
    
    def start_container(self, container_id: str) -> bool:
        """
        启动容器
        
        Args:
            container_id: 容器 ID
            
        Returns:
            bool: 是否成功启动
        """
        try:
            container = self.client.containers.get(container_id)
            container.start()
            return True
        except Exception as e:
            raise RuntimeError(f"启动容器失败: {str(e)}")
    
    def stop_container(self, container_id: str) -> bool:
        """
        停止容器
        
        Args:
            container_id: 容器 ID
            
        Returns:
            bool: 是否成功停止
        """
        try:
            container = self.client.containers.get(container_id)
            container.stop()
            return True
        except Exception as e:
            raise RuntimeError(f"停止容器失败: {str(e)}")
    
    def remove_container(self, container_id: str, remove_volumes: bool = False) -> bool:
        """
        删除容器
        
        Args:
            container_id: 容器 ID
            remove_volumes: 是否删除关联的卷
            
        Returns:
            bool: 是否成功删除
        """
        try:
            container = self.client.containers.get(container_id)
            container.remove(v=remove_volumes, force=True)
            return True
        except Exception as e:
            raise RuntimeError(f"删除容器失败: {str(e)}")

    def restart_container(self, container_id: str) -> bool:
        """
        重启容器
        
        Args:
            container_id: 容器 ID
            
        Returns:
            bool: 是否成功重启
        """
        try:
            container = self.client.containers.get(container_id)
            container.restart()
            return True
        except Exception as e:
            raise RuntimeError(f"重启容器失败: {str(e)}")
    
    def get_container_status(self, container_id: str) -> Dict[str, Any]:
        """
        获取容器状态
        
        Args:
            container_id: 容器 ID
            
        Returns:
            dict: 容器状态信息
        """
        try:
            container = self.client.containers.get(container_id)
            return {
                'id': container.id,
                'name': container.name,
                'status': container.status,
                'created': container.attrs['Created'],
                'state': container.attrs['State']
            }
        except Exception as e:
            raise RuntimeError(f"获取容器状态失败: {str(e)}")
    
    def read_deploy_yaml(self, config_path: str) -> Dict[str, Any]:
        """
        读取 deploy.yaml 配置文件
        
        Args:
            config_path: 配置文件所在目录路径
            
        Returns:
            dict: 配置内容
        """
        deploy_yaml_path = os.path.join(config_path, "deploy.yaml")
        
        if not os.path.exists(deploy_yaml_path):
            raise FileNotFoundError(f"配置文件不存在: {deploy_yaml_path}")
        
        try:
            with open(deploy_yaml_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            return config
        except Exception as e:
            raise RuntimeError(f"读取配置文件失败: {str(e)}")
    
    def get_remote_url(self, config_path: str) -> str:
        """
        通过 SSH 隧道获取远程访问 URL
        
        Args:
            config_path: 配置文件路径
            
        Returns:
            str: 远程访问 URL
        """
        # 从 deploy.yaml 读取 SSH 用户名
        # 增加重试机制，等待配置文件生成（最多等待 30 秒）
        ssh_user = None
        last_error = None
        deploy_yaml_path = os.path.join(config_path, "deploy.yaml")
        
        # 1. 等待配置文件生成
        config_exists = False
        for _ in range(30):  # 尝试 30 次，每次 1 秒（总共 30 秒）
            if os.path.exists(deploy_yaml_path):
                config_exists = True
                break
            time.sleep(1)
            
        if not config_exists:
            raise RuntimeError("超时：配置文件未生成")

        # 2. 生成随机字符串并填入 deploy.yaml
        import random
        import string
        
        try:
            # 读取现有配置
            with open(deploy_yaml_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f) or {}
            
            deploy_config = config.get('Deploy', {})
            remote_access = deploy_config.get('RemoteAccess', {})
            ssh_user = remote_access.get('SSHUser')
            
            # 如果没有 SSHUser，生成一个并写入
            if not ssh_user:
                # 生成 10 位随机字符串
                timestamp_part = str(int(time.time()))[-6:] # 取时间戳后6位
                random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
                generated_ssh_user = f"alas{timestamp_part}{random_part}"
                
                # 更新配置结构
                if 'Deploy' not in config:
                    config['Deploy'] = {}
                if 'RemoteAccess' not in config['Deploy']:
                    config['Deploy']['RemoteAccess'] = {}
                
                config['Deploy']['RemoteAccess']['SSHUser'] = generated_ssh_user
                
                # 写回文件
                with open(deploy_yaml_path, 'w', encoding='utf-8') as f:
                    yaml.dump(config, f, allow_unicode=True)
                
                ssh_user = generated_ssh_user
                print(f"已自动生成并写入 SSHUser: {ssh_user}")
                
                # 写入后等待 5 秒，确保文件写入完成且容器可能进行的重载完成
                print("等待 5 秒以确认配置生效...")
                time.sleep(5)
                
                # 再次读取配置以确认
                try:
                    with open(deploy_yaml_path, 'r', encoding='utf-8') as f:
                        config_recheck = yaml.safe_load(f) or {}
                    ssh_user_recheck = config_recheck.get('Deploy', {}).get('RemoteAccess', {}).get('SSHUser')
                    
                    if ssh_user_recheck:
                        ssh_user = ssh_user_recheck
                        print(f"确认使用的 SSHUser: {ssh_user}")
                except Exception as e:
                    print(f"重读配置失败，将使用刚才生成的配置: {str(e)}")
                
        except Exception as e:
            raise RuntimeError(f"处理配置文件失败: {str(e)}")
            
        if not ssh_user:
             # 双重检查
            raise ValueError("未能获取或生成 SSHUser")
            
        # 3. 建立 SSH 隧道
        # 解析 SSH 服务器地址和端口
        ssh_server_parts = settings.DOCKER_SSH_SERVER.split(':')
        ssh_host = ssh_server_parts[0]
        ssh_port = ssh_server_parts[1] if len(ssh_server_parts) > 1 else '22'
        
        # 构建 SSH 命令
        # 添加参数以跳过主机密钥检查，解决 "Host key verification failed" 问题
        ssh_command = [
            'ssh', '-R', '/:127.0.0.1:22267',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            '-p', ssh_port,
            f'{ssh_user}@{ssh_host}',
            '--', '--output', 'json'
        ]
        
        try:
            # 执行 SSH 命令
            process = subprocess.Popen(
                ssh_command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # 读取第一行输出（应该是 JSON 格式的连接信息）
            stdout_line = process.stdout.readline()
            
            if not stdout_line:
                stderr = process.stderr.read()
                raise RuntimeError(f"SSH 连接失败: {stderr}")
            
            # 解析 JSON 响应
            connection_info = json.loads(stdout_line)
            address = connection_info.get('address')
            
            if not address:
                raise RuntimeError("未能从 SSH 响应中获取地址")
            
            return address
            
        except json.JSONDecodeError as e:
            raise RuntimeError(f"解析 SSH 响应失败: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"建立 SSH 隧道失败: {str(e)}")
