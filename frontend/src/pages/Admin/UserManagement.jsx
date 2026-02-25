import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag, Grid, Drawer, Descriptions, Divider } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  MobileOutlined,
  RightOutlined,
  UserOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import api from '../../utils/request';

const { Option } = Select;
const { useBreakpoint } = Grid;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignSimModalVisible, setAssignSimModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [assignSimForm] = Form.useForm();
  const [simulators, setSimulators] = useState([]);
  const screens = useBreakpoint();
  const isMobile = screens.sm === false;

  // Detail Drawer state (Mobile)
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/users');
      setUsers(data);
      // Sync drawer data
      if (selectedUser) {
        const updated = data.find(u => u.id === selectedUser.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (error) {
      console.error('获取用户列表失败', error);
    }
    setLoading(false);
  };

  const fetchInstances = async () => {
    try {
      const data = await api.get('/admin/instances');
      setInstances(data);
    } catch (error) {
      console.error('获取实例列表失败', error);
    }
  };

  const fetchSimulators = async () => {
    try {
      const data = await api.get('/admin/simulators');
      setSimulators(data);
    } catch (error) {
      console.error('获取模拟器列表失败', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchInstances();
    fetchSimulators();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除用户 "${record.username}" 吗？`,
      onOk: async () => {
        try {
          await api.delete(`/admin/users/${record.id}`);
          message.success('删除成功');
          setDetailVisible(false);
          fetchUsers();
        } catch (error) {
        }
      },
    });
  };

  const handleAssign = (record) => {
    setEditingUser(record);
    assignForm.setFieldsValue({
      instance_ids: record.instance_ids,
    });
    setAssignModalVisible(true);
  };

  const handleAssignSim = (record) => {
    setEditingUser(record);
    assignSimForm.setFieldsValue({
      simulator_ids: record.simulator_ids || [],
    });
    setAssignSimModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        const updateData = { ...values };
        if (!updateData.password) delete updateData.password;
        await api.put(`/admin/users/${editingUser.id}`, updateData);
        message.success('更新成功');
      } else {
        await api.post('/admin/users', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
    }
  };

  const handleAssignOk = async () => {
    try {
      const values = await assignForm.validateFields();
      await api.post(`/admin/users/${editingUser.id}/instances`, values);
      message.success('分配成功');
      setAssignModalVisible(false);
      fetchUsers();
    } catch (error) {
    }
  };

  const handleAssignSimOk = async () => {
    try {
      const values = await assignSimForm.validateFields();
      await api.post(`/admin/users/${editingUser.id}/simulators`, values);
      message.success('分配模拟器成功');
      setAssignSimModalVisible(false);
      fetchUsers();
    } catch (error) {
    }
  };

  const columns = isMobile ? [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text, record) => (
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <UserOutlined style={{ color: record.role === 'admin' ? '#faad14' : '#1890ff' }} />
            <span style={{ fontWeight: 500 }}>{text}</span>
          </Space>
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
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role) => (
        <Tag color={role === 'admin' ? 'gold' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '已分配资产',
      key: 'assets',
      render: (_, record) => (
        <Space size="middle">
          <span><DatabaseOutlined /> {record.instance_ids?.length || 0}</span>
          <span><MobileOutlined /> {record.simulator_ids?.length || 0}</span>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }}>编辑</Button>
          <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); setSelectedUser(record); setDetailVisible(true); }}>详情/分配</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDelete(record); }}>删除</Button>
        </Space>
      ),
    },
  ];

  const handleRowClick = (record) => {
    if (isMobile) {
      setSelectedUser(record);
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
        <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '24px' }}>用户管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          block={isMobile}
        >
          添加用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        scroll={isMobile ? undefined : { x: 800 }}
        pagination={isMobile ? { pageSize: 15, simple: true } : { size: 'default' }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: isMobile ? 'pointer' : 'default' }
        })}
      />

      {/* Detail Drawer */}
      <Drawer
        title="用户详情"
        placement="bottom"
        height="75vh"
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
        styles={{ body: { padding: '16px' } }}
      >
        {selectedUser && (
          <div>
            <Descriptions title={selectedUser.username} column={1} size="small">
              <Descriptions.Item label="用户 ID">{selectedUser.id}</Descriptions.Item>
              <Descriptions.Item label="角色信息">
                <Tag color={selectedUser.role === 'admin' ? 'gold' : 'blue'}>
                  {selectedUser.role === 'admin' ? '管理员' : '普通用户'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>已分配实例</Divider>
            <div style={{ marginBottom: 16 }}>
              {selectedUser.instance_ids?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {selectedUser.instance_ids.map(id => {
                    const inst = instances.find(i => i.id === id);
                    return <Tag key={id}>{inst ? inst.name : `ID:${id}`}</Tag>;
                  })}
                </div>
              ) : <span style={{ color: '#ccc' }}>未分配任何实例</span>}
            </div>

            <Divider orientation="left" plain>已分配模拟器</Divider>
            <div style={{ marginBottom: 16 }}>
              {selectedUser.simulator_ids?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {selectedUser.simulator_ids.map(id => {
                    const sim = simulators.find(s => s.id === id);
                    return <Tag color="purple" key={id}>{sim ? sim.name : `ID:${id}`}</Tag>;
                  })}
                </div>
              ) : <span style={{ color: '#ccc' }}>未分配任何模拟器</span>}
            </div>

            <Divider orientation="left" plain>快速操作</Divider>
            <Space size="middle" wrap style={{ width: '100%', justifyContent: 'center', marginBottom: 24 }}>
              <Button icon={<EditOutlined />} onClick={() => handleEdit(selectedUser)}>编辑账号</Button>
              <Button icon={<DatabaseOutlined />} onClick={() => handleAssign(selectedUser)} disabled={selectedUser.role === 'admin'}>分配实例</Button>
              <Button icon={<MobileOutlined />} onClick={() => handleAssignSim(selectedUser)} disabled={selectedUser.role === 'admin'}>分配模拟器</Button>
              <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(selectedUser)}>删除用户</Button>
            </Space>
          </div>
        )}
      </Drawer>

      {/* 用户编辑/创建模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={isMobile ? '95%' : 400}
        centered={isMobile}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="role" label="角色" initialValue="user" rules={[{ required: true, message: '请选择角色' }]}>
            <Select>
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配实例模态框 */}
      <Modal
        title={`分配实例 - ${editingUser?.username}`}
        open={assignModalVisible}
        onOk={handleAssignOk}
        onCancel={() => setAssignModalVisible(false)}
        width={isMobile ? '95%' : 500}
        centered={isMobile}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="instance_ids" label="选择实例">
            <Select mode="multiple" placeholder="请选择实例" style={{ width: '100%' }}>
              {instances.map(inst => (
                <Option key={inst.id} value={inst.id}>{inst.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配模拟器模态框 */}
      <Modal
        title={`分配模拟器 - ${editingUser?.username}`}
        open={assignSimModalVisible}
        onOk={handleAssignSimOk}
        onCancel={() => setAssignSimModalVisible(false)}
        width={isMobile ? '95%' : 500}
        centered={isMobile}
      >
        <Form form={assignSimForm} layout="vertical">
          <Form.Item name="simulator_ids" label="选择模拟器">
            <Select mode="multiple" placeholder="请选择模拟器" style={{ width: '100%' }}>
              {simulators.map(sim => (
                <Option key={sim.id} value={sim.id}>{sim.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
