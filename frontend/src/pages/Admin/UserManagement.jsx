import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined } from '@ant-design/icons';
import api from '../../utils/request';

const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/users');
      setUsers(data);
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

  useEffect(() => {
    fetchUsers();
    fetchInstances();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      role: record.role,
    });
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
          fetchUsers();
        } catch (error) {
          // 错误处理已在拦截器中完成
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

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        // 更新
        const updateData = { ...values };
        if (!updateData.password) delete updateData.password;
        await api.put(`/admin/users/${editingUser.id}`, updateData);
        message.success('更新成功');
      } else {
        // 创建
        await api.post('/admin/users', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      // 表单验证错误或API错误
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
      // 错误处理
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '已分配实例',
      dataIndex: 'instance_ids',
      key: 'instances',
      render: (ids) => {
        if (!ids || ids.length === 0) return <span style={{ color: '#ccc' }}>无</span>;
        return ids.map(id => {
          const inst = instances.find(i => i.id === id);
          return <Tag key={id}>{inst ? inst.name : `ID:${id}`}</Tag>;
        });
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" icon={<DatabaseOutlined />} onClick={() => handleAssign(record)} disabled={record.role === 'admin'}>分配实例</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>用户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建用户
        </Button>
      </div>

      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} />

      {/* 用户编辑/创建模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item 
            name="password" 
            label={editingUser ? "新密码 (留空则不修改)" : "密码"}
            rules={[{ required: !editingUser, message: '请输入密码' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="user">
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
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="instance_ids" label="选择实例">
            <Select mode="multiple" placeholder="请选择实例" style={{ width: '100%' }}>
              {instances.map(inst => (
                <Option key={inst.id} value={inst.id}>{inst.name} ({inst.url})</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
