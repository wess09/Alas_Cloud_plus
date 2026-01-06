import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Switch, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseCircleOutlined, CloseCircleOutlined, ReloadOutlined, CloudUploadOutlined } from '@ant-design/icons';
import api from '../../utils/request';

const InstanceManagement = () => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInstance, setEditingInstance] = useState(null);
  const [form] = Form.useForm();

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/instances');
      setInstances(data);
    } catch (error) {
      console.error('获取实例列表失败', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleCreate = () => {
    setEditingInstance(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingInstance(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除实例 "${record.name}" 吗？`,
      onOk: async () => {
        try {
          await api.delete(`/admin/instances/${record.id}`);
          message.success('删除成功');
          fetchInstances();
        } catch (error) {
          // 错误处理已在拦截器中完成
        }
      },
    });
  };

  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setConfirmLoading(true);
      
      if (editingInstance) {
        await api.put(`/admin/instances/${editingInstance.id}`, values);
        message.success('更新成功');
      } else {
        // 检查是否启用自动部署
        const autoDeploy = values.autoDeploy || false;
        
        // 移除表单字段，这些不是实例创建所需的
        delete values.autoDeploy;
        
        // 构建请求参数
        const params = new URLSearchParams();
        if (autoDeploy) {
          params.append('auto_deploy', 'true');
        }
        
        // 增加超时时间到 60 秒，因为自动部署可能需要较长时间
        await api.post(`/admin/instances?${params.toString()}`, values, { timeout: 60000 });
        message.success('创建成功' + (autoDeploy ? '，正在部署容器（需等待约20秒获取URL）...' : ''));
      }
      setModalVisible(false);
      fetchInstances();
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        message.warning('请求超时，但在后台可能仍在继续执行，请稍后刷新列表查看。');
      }
      // 表单验证错误或API错误
    } finally {
      setConfirmLoading(false);
    }
  };

  // Docker 容器操作
  const handleDeployContainer = async (instanceId) => {
    Modal.confirm({
      title: '部署容器',
      content: '确定要为该实例部署 Docker 容器吗？SSH 用户名将从 deploy.yaml 配置文件自动读取。',
      onOk: async () => {
        try {
          await api.post(`/admin/docker/instances/${instanceId}/deploy`);
          message.success('容器部署成功');
          fetchInstances();
        } catch (error) {
          // 错误处理已在拦截器中完成
        }
      },
    });
  };

  const handleStartContainer = async (instanceId) => {
    try {
      await api.post(`/admin/docker/instances/${instanceId}/start`);
      message.success('容器启动成功');
      fetchInstances();
    } catch (error) {
      // 错误处理已在拦截器中完成
    }
  };

  const handleStopContainer = async (instanceId) => {
    try {
      await api.post(`/admin/docker/instances/${instanceId}/stop`);
      message.success('容器停止成功');
      fetchInstances();
    } catch (error) {
      // 错误处理已在拦截器中完成
    }
  };

  const handleRestartContainer = async (instanceId) => {
    Modal.confirm({
      title: '确认重启',
      content: '确定要重启该实例的 Docker 容器吗？',
      onOk: async () => {
        try {
          await api.post(`/admin/docker/instances/${instanceId}/restart`);
          message.success('容器重启成功');
          fetchInstances();
        } catch (error) {
          // 错误处理已在拦截器中完成
        }
      },
    });
  };

  const handleRemoveContainer = async (instanceId) => {
    Modal.confirm({
      title: '确认删除容器',
      content: '确定要删除该实例的 Docker 容器吗？此操作不可恢复！',
      onOk: async () => {
        try {
          await api.delete(`/admin/docker/instances/${instanceId}/container`);
          message.success('容器删除成功');
          fetchInstances();
        } catch (error) {
          // 错误处理已在拦截器中完成
        }
      },
    });
  };

  const handleRefreshStatus = async (instanceId) => {
    try {
      await api.get(`/admin/docker/instances/${instanceId}/status`);
      message.success('状态已刷新');
      fetchInstances();
    } catch (error) {
      // 错误处理已在拦截器中完成
    }
  };

  const getContainerStatusTag = (status) => {
    const statusMap = {
      'running': { color: 'green', text: '运行中' },
      'stopped': { color: 'default', text: '已停止' },
      'created': { color: 'blue', text: '已创建' },
      'removed': { color: 'red', text: '已删除' },
      'exited': { color: 'orange', text: '已退出' },
    };
    const config = statusMap[status] || { color: 'default', text: status || '未知' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleUpdateUrl = async (record) => {
    try {
      message.loading({ content: '正在更新远程 URL...', key: 'updateUrl' });
      const { url } = await api.post(`/admin/docker/instances/${record.id}/update-url`);
      message.success({ content: `远程 URL 更新成功: ${url}`, key: 'updateUrl' });
      fetchInstances();
    } catch (error) {
      message.error({ content: '更新远程 URL 失败', key: 'updateUrl' });
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '实例名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (text, record) => {
        if (!text && record.container_id) {
          return (
            <Button 
              type="link" 
              size="small"
              icon={<ReloadOutlined />} 
              onClick={() => handleUpdateUrl(record)}
            >
              获取 URL
            </Button>
          );
        }
        return text ? <a href={text} target="_blank" rel="noopener noreferrer">{text}</a> : '-';
      }
    },
    {
      title: '容器状态',
      dataIndex: 'container_status',
      key: 'container_status',
      render: (status, record) => {
        if (!record.container_id) {
          return <Tag color="default">未部署</Tag>;
        }
        return (
          <Space>
            {getContainerStatusTag(status)}
            <Tooltip title="刷新状态">
              <Button 
                type="text" 
                size="small" 
                icon={<ReloadOutlined />} 
                onClick={() => handleRefreshStatus(record.id)}
              />
            </Tooltip>
          </Space>
        );
      }
    },
    {
      title: '容器名称',
      dataIndex: 'container_name',
      key: 'container_name',
      render: (text) => text || '-'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
          
          {!record.container_id && (
            <Button 
              type="link" 
              icon={<CloudUploadOutlined />} 
              onClick={() => handleDeployContainer(record.id)}
            >
              部署容器
            </Button>
          )}
          
          {record.container_id && record.container_status === 'running' && (
            <>
              <Button 
                type="link" 
                icon={<PauseCircleOutlined />} 
                onClick={() => handleStopContainer(record.id)}
              >
                停止
              </Button>
              <Button 
                type="link" 
                icon={<ReloadOutlined />} 
                onClick={() => handleRestartContainer(record.id)}
              >
                重启
              </Button>
            </>
          )}
          
          {record.container_id && record.container_status !== 'running' && record.container_status !== 'removed' && (
            <Button 
              type="link" 
              icon={<PlayCircleOutlined />} 
              onClick={() => handleStartContainer(record.id)}
            >
              启动
            </Button>
          )}
          
          {record.container_id && !record.url && (
            <Button 
              type="link" 
              icon={<ReloadOutlined />} 
              onClick={() => handleUpdateUrl(record)}
            >
              更新URL
            </Button>
          )}
          
          {record.container_id && record.container_status !== 'removed' && (
            <Button 
              type="link" 
              danger 
              icon={<CloseCircleOutlined />} 
              onClick={() => handleRemoveContainer(record.id)}
            >
              删除容器
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>实例管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建实例
        </Button>
      </div>

      <Table columns={columns} dataSource={instances} rowKey="id" loading={loading} scroll={{ x: 1200 }} />

      <Modal
        title={editingInstance ? '编辑实例' : '新建实例'}
        open={modalVisible}
        onOk={handleModalOk}
        confirmLoading={confirmLoading}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="实例名称" rules={[{ required: true, message: '请输入实例名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="url" label="URL">
            <Input placeholder="自动部署时可选，将自动生成" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item>
          
          {!editingInstance && (
            <Form.Item name="autoDeploy" label="自动部署 Docker 容器" valuePropName="checked" extra="SSH 用户名将从 deploy.yaml 配置文件自动读取">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default InstanceManagement;

