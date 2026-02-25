import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Switch, Tag, Tooltip, Grid, Drawer, Descriptions, Divider } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  RightOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import api from '../../utils/request';

const { useBreakpoint } = Grid;

const InstanceManagement = () => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInstance, setEditingInstance] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = screens.sm === false;

  // Detail Drawer state (Mobile)
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);

  // Config modal state
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [configContent, setConfigContent] = useState('');
  const [configInstanceId, setConfigInstanceId] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/instances');
      setInstances(data);
      // Update selected instance if drawer is open to sync status
      if (selectedInstance) {
        const updated = data.find(i => i.id === selectedInstance.id);
        if (updated) setSelectedInstance(updated);
      }
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
          setDetailVisible(false);
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
        const autoDeploy = values.autoDeploy || false;
        delete values.autoDeploy;
        const params = new URLSearchParams();
        if (autoDeploy) params.append('auto_deploy', 'true');
        await api.post(`/admin/instances?${params.toString()}`, values, { timeout: 60000 });
        message.success('创建成功' + (autoDeploy ? '，正在部署容器...' : ''));
      }
      setModalVisible(false);
      fetchInstances();
    } catch (error) {
      // 错误管理
    } finally {
      setConfirmLoading(false);
    }
  };

  // Docker Container Operations
  const handleDeployContainer = async (instanceId) => {
    Modal.confirm({
      title: '部署容器',
      content: '确定要为该实例部署 Docker 容器吗？',
      onOk: async () => {
        setActionLoading(prev => ({ ...prev, [`${instanceId}_deploy`]: true }));
        try {
          await api.post(`/admin/docker/instances/${instanceId}/deploy`);
          message.success('容器部署成功');
          fetchInstances();
        } catch (error) {
        } finally {
          setActionLoading(prev => ({ ...prev, [`${instanceId}_deploy`]: false }));
        }
      },
    });
  };

  const handleStartContainer = async (instanceId) => {
    setActionLoading(prev => ({ ...prev, [`${instanceId}_start`]: true }));
    try {
      await api.post(`/admin/docker/instances/${instanceId}/start`);
      message.success('容器启动成功');
      fetchInstances();
    } catch (error) {
    } finally {
      setActionLoading(prev => ({ ...prev, [`${instanceId}_start`]: false }));
    }
  };

  const handleStopContainer = async (instanceId) => {
    Modal.confirm({
      title: '确认停止',
      content: '确定要停止该实例的 Docker 容器吗？',
      okType: 'danger',
      onOk: async () => {
        setActionLoading(prev => ({ ...prev, [`${instanceId}_stop`]: true }));
        try {
          await api.post(`/admin/docker/instances/${instanceId}/stop`);
          message.success('容器停止成功');
          fetchInstances();
        } catch (error) {
        } finally {
          setActionLoading(prev => ({ ...prev, [`${instanceId}_stop`]: false }));
        }
      },
    });
  };

  const handleRestartContainer = async (instanceId) => {
    Modal.confirm({
      title: '确认重启',
      content: '确定要重启该实例的 Docker 容器吗？',
      onOk: async () => {
        setActionLoading(prev => ({ ...prev, [`${instanceId}_restart`]: true }));
        try {
          await api.post(`/admin/docker/instances/${instanceId}/restart`, {}, { timeout: 60000 });
          message.success('容器重启成功');
          fetchInstances();
        } catch (error) {
        } finally {
          setActionLoading(prev => ({ ...prev, [`${instanceId}_restart`]: false }));
        }
      },
    });
  };

  const handleRemoveContainer = async (instanceId) => {
    Modal.confirm({
      title: '确认删除容器',
      content: '确定要删除该实例的 Docker 容器吗？此操作不可恢复！',
      onOk: async () => {
        setActionLoading(prev => ({ ...prev, [`${instanceId}_remove`]: true }));
        try {
          await api.delete(`/admin/docker/instances/${instanceId}/container`);
          message.success('容器删除成功');
          fetchInstances();
        } catch (error) {
        } finally {
          setActionLoading(prev => ({ ...prev, [`${instanceId}_remove`]: false }));
        }
      },
    });
  };

  const handleRefreshStatus = async (instanceId) => {
    setActionLoading(prev => ({ ...prev, [`${instanceId}_refresh`]: true }));
    try {
      await api.get(`/admin/docker/instances/${instanceId}/status`);
      message.success('状态已刷新');
      fetchInstances();
    } catch (error) {
    } finally {
      setActionLoading(prev => ({ ...prev, [`${instanceId}_refresh`]: false }));
    }
  };

  const handleOpenConfig = async (record) => {
    setConfigInstanceId(record.id);
    setConfigLoading(true);
    setConfigModalVisible(true);
    try {
      const { content } = await api.get(`/admin/docker/instances/${record.id}/config`);
      setConfigContent(content);
    } catch (error) {
      setConfigContent('');
    }
    setConfigLoading(false);
  };

  const handleSaveConfig = async () => {
    setConfigLoading(true);
    try {
      await api.put(`/admin/docker/instances/${configInstanceId}/config`, { content: configContent });
      message.success('配置保存成功');
      setConfigModalVisible(false);
    } catch (error) {
    }
    setConfigLoading(false);
  };

  const handleUpdateUrl = async (record) => {
    try {
      message.loading({ content: '正在更新远程 URL...', key: 'updateUrl' });
      setActionLoading(prev => ({ ...prev, [`${record.id}_updateUrl`]: true }));
      const { url } = await api.post(`/admin/docker/instances/${record.id}/update-url`);
      message.success({ content: `远程 URL 更新成功`, key: 'updateUrl' });
      fetchInstances();
    } catch (error) {
      message.error({ content: '更新远程 URL 失败', key: 'updateUrl' });
    } finally {
      setActionLoading(prev => ({ ...prev, [`${record.id}_updateUrl`]: false }));
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
    return <Tag color={config.color} style={{ margin: 0 }}>{config.text}</Tag>;
  };

  const columns = isMobile ? [
    {
      title: '实例名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500 }}>{text}</span>
          <RightOutlined style={{ color: '#ccc', fontSize: '12px' }} />
        </Space>
      )
    }
  ] : [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '实例名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 200,
      render: (text, record) => {
        if (!text && record.container_id) {
          return (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={(e) => { e.stopPropagation(); handleUpdateUrl(record); }}
              loading={actionLoading[`${record.id}_updateUrl`]}
            >
              获取 URL
            </Button>
          );
        }
        return text ? <a href={text} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>{text}</a> : '-';
      }
    },
    {
      title: '健康',
      dataIndex: 'health_status',
      key: 'health_status',
      width: 80,
      render: (status) => {
        let color = 'default';
        let text = '未知';
        if (status === 'healthy') { color = 'success'; text = '正常'; }
        else if (status === 'unhealthy') { color = 'error'; text = '异常'; }
        return <Tag color={color} style={{ margin: 0 }}>{text}</Tag>;
      }
    },
    {
      title: '容器',
      dataIndex: 'container_status',
      key: 'container_status',
      width: 140,
      render: (status, record) => record.container_id ? (
        <Space size="small">
          {getContainerStatusTag(status)}
          <Button type="text" size="small" icon={<ReloadOutlined />} onClick={(e) => { e.stopPropagation(); handleRefreshStatus(record.id); }} loading={actionLoading[`${record.id}_refresh`]} />
        </Space>
      ) : <Tag color="default">未部署</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }}>编辑</Button>
          <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); setSelectedInstance(record); setDetailVisible(true); }}>详情</Button>
        </Space>
      ),
    },
  ];

  const handleRowClick = (record) => {
    if (isMobile) {
      setSelectedInstance(record);
      setDetailVisible(true);
    }
  };

  return (
    <div style={{ padding: isMobile ? '0' : '0 12px' }}>
      <div style={{
        marginBottom: 16,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: 12
      }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '24px' }}>实例管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          block={isMobile}
        >
          新建实例
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={instances}
        rowKey="id"
        loading={loading}
        scroll={isMobile ? undefined : { x: 1000 }}
        pagination={isMobile ? { pageSize: 15, simple: true } : { size: 'default' }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: isMobile ? 'pointer' : 'default' }
        })}
      />

      {/* Detail Drawer (Mobile Only Recommended but works for both) */}
      <Drawer
        title="实例详情"
        placement="bottom"
        height="70vh"
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
        styles={{ body: { padding: '16px' } }}
      >
        {selectedInstance && (
          <div>
            <Descriptions title={selectedInstance.name} column={1} size="small">
              <Descriptions.Item label="ID">{selectedInstance.id}</Descriptions.Item>
              <Descriptions.Item label="健康状态">
                <Tag color={selectedInstance.health_status === 'healthy' ? 'success' : 'error'}>
                  {selectedInstance.health_status === 'healthy' ? '正常' : '异常'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="容器状态">
                {getContainerStatusTag(selectedInstance.container_status)}
                {selectedInstance.container_id && (
                  <Button size="small" type="link" icon={<ReloadOutlined />} onClick={() => handleRefreshStatus(selectedInstance.id)} loading={actionLoading[`${selectedInstance.id}_refresh`]} />
                )}
              </Descriptions.Item>
              <Descriptions.Item label="远程 URL">
                {selectedInstance.url ? (
                  <a href={selectedInstance.url} target="_blank" rel="noopener noreferrer">
                    <GlobalOutlined /> 点击跳转
                  </a>
                ) : '未获取'}
              </Descriptions.Item>
              <Descriptions.Item label="描述内容">{selectedInstance.description || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>容器管理</Divider>
            <Space size="middle" wrap style={{ width: '100%', justifyContent: 'center' }}>
              {!selectedInstance.container_id ? (
                <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => handleDeployContainer(selectedInstance.id)} loading={actionLoading[`${selectedInstance.id}_deploy`]}>部署容器</Button>
              ) : (
                <>
                  {selectedInstance.container_status !== 'running' && (
                    <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStartContainer(selectedInstance.id)} loading={actionLoading[`${selectedInstance.id}_start`]}>启动</Button>
                  )}
                  {selectedInstance.container_status === 'running' && (
                    <>
                      <Button danger icon={<PauseCircleOutlined />} onClick={() => handleStopContainer(selectedInstance.id)} loading={actionLoading[`${selectedInstance.id}_stop`]}>停止</Button>
                      <Button icon={<ReloadOutlined />} onClick={() => handleRestartContainer(selectedInstance.id)} loading={actionLoading[`${selectedInstance.id}_restart`]}>重启</Button>
                    </>
                  )}
                  <Button danger ghost icon={<CloseCircleOutlined />} onClick={() => handleRemoveContainer(selectedInstance.id)} loading={actionLoading[`${selectedInstance.id}_remove`]}>删除容器</Button>
                </>
              )}
            </Space>

            <Divider orientation="left" plain>系统操作</Divider>
            <Space size="middle" wrap style={{ width: '100%', justifyContent: 'center', marginBottom: 24 }}>
              <Button icon={<EditOutlined />} onClick={() => handleEdit(selectedInstance)}>编辑信息</Button>
              {selectedInstance.config_path && (
                <Button icon={<SettingOutlined />} onClick={() => handleOpenConfig(selectedInstance)}>修改配置</Button>
              )}
              <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(selectedInstance)}>删除实例</Button>
            </Space>
          </div>
        )}
      </Drawer>

      <Modal
        title={editingInstance ? '编辑实例' : '新建实例'}
        open={modalVisible}
        onOk={handleModalOk}
        confirmLoading={confirmLoading}
        onCancel={() => setModalVisible(false)}
        width={isMobile ? '95%' : 600}
        centered={isMobile}
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

      <Modal
        title="编辑配置文件 (deploy.yaml)"
        open={configModalVisible}
        onOk={handleSaveConfig}
        confirmLoading={configLoading}
        onCancel={() => setConfigModalVisible(false)}
        width={isMobile ? '95%' : 800}
        centered={isMobile}
        okText="保存"
        cancelText="取消"
      >
        <Editor
          height="60vh"
          defaultLanguage="yaml"
          value={configContent}
          onChange={(value) => setConfigContent(value)}
          theme="vs-dark"
          options={{ minimap: { enabled: true }, fontSize: 14, scrollBeyondLastLine: false, wordWrap: 'on', automaticLayout: true }}
        />
      </Modal>
    </div>
  );
};

export default InstanceManagement;

