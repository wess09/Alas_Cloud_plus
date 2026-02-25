import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Grid, Tooltip, Tag, Drawer, Descriptions, Divider } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    LinkOutlined,
    RightOutlined,
    MobileOutlined,
    GlobalOutlined,
    SafetyOutlined
} from '@ant-design/icons';
import api from '../../utils/request';

const { useBreakpoint } = Grid;

const SimulatorManagement = () => {
    const [simulators, setSimulators] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSimulator, setEditingSimulator] = useState(null);
    const [testLoading, setTestLoading] = useState({}); // { id: boolean }
    const [form] = Form.useForm();
    const screens = useBreakpoint();
    const isMobile = screens.sm === false;

    // Detail Drawer state
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedSimulator, setSelectedSimulator] = useState(null);

    const fetchSimulators = async () => {
        setLoading(true);
        try {
            const data = await api.get('/admin/simulators');
            setSimulators(data);
            if (selectedSimulator) {
                const updated = data.find(s => s.id === selectedSimulator.id);
                if (updated) setSelectedSimulator(updated);
            }
        } catch (error) {
            console.error('获取模拟器列表失败', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSimulators();
    }, []);

    const handleTestConnection = async (url, id = 'manual') => {
        if (!url) {
            message.warning('请先输入控制端 URL');
            return;
        }
        setTestLoading(prev => ({ ...prev, [id]: true }));
        try {
            const res = await api.post('/admin/simulators/test-connection', { url });
            Modal.success({
                title: '连接成功',
                content: (
                    <div>
                        <p>云端后端已成功访问控制端！</p>
                        <Tag color="blue">{res.remote_info?.status || 'Active'}</Tag>
                    </div>
                ),
                centered: true
            });
        } catch (error) {
        }
        setTestLoading(prev => ({ ...prev, [id]: false }));
    };

    const handleCreate = () => {
        setEditingSimulator(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingSimulator(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除模拟器 "${record.name}" 吗？此操作无法撤销。`,
            onOk: async () => {
                try {
                    await api.delete(`/admin/simulators/${record.id}`);
                    message.success('删除成功');
                    setDetailVisible(false);
                    fetchSimulators();
                } catch (error) {
                }
            },
        });
    };

    const [confirmLoading, setConfirmLoading] = useState(false);

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            setConfirmLoading(true);

            if (editingSimulator) {
                await api.put(`/admin/simulators/${editingSimulator.id}`, values);
                message.success('更新成功');
            } else {
                await api.post('/admin/simulators', values);
                message.success('创建成功');
            }
            setModalVisible(false);
            fetchSimulators();
        } catch (error) {
        } finally {
            setConfirmLoading(false);
        }
    };

    const columns = isMobile ? [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            render: (text) => (
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                        <MobileOutlined style={{ color: '#722ed1' }} />
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
            title: '名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '模拟器ID',
            dataIndex: 'emulator_id',
            key: 'emulator_id',
            width: 100,
        },
        {
            title: 'WebVNC URL',
            dataIndex: 'ws_scrcpy_url',
            key: 'ws_scrcpy_url',
            render: (text) => text ? <a href={text} target="_blank" rel="noopener noreferrer" style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>{text}</a> : '-',
        },
        {
            title: '控制端状态',
            key: 'status',
            render: (_, record) => (
                <Button
                    size="small"
                    icon={<CheckCircleOutlined />}
                    loading={testLoading[record.id]}
                    onClick={(e) => { e.stopPropagation(); handleTestConnection(record.remote_control_url, record.id); }}
                >
                    测试连接
                </Button>
            )
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }}>编辑</Button>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDelete(record); }}>删除</Button>
                </Space>
            ),
        },
    ];

    const handleRowClick = (record) => {
        if (isMobile) {
            setSelectedSimulator(record);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '24px' }}>模拟器管理</h2>
                    <Tooltip title="配置云端如何访问您的本地模拟器控制后端">
                        <LinkOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreate}
                    block={isMobile}
                >
                    新建模拟器
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={simulators}
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
                title="模拟器详情"
                placement="bottom"
                height="70vh"
                onClose={() => setDetailVisible(false)}
                open={detailVisible}
                styles={{ body: { padding: '16px' } }}
            >
                {selectedSimulator && (
                    <div>
                        <Descriptions title={selectedSimulator.name} column={1} size="small">
                            <Descriptions.Item label="模拟器 ID">{selectedSimulator.emulator_id || '0'}</Descriptions.Item>
                            <Descriptions.Item label="WebVNC URL">
                                {selectedSimulator.ws_scrcpy_url ? (
                                    <a href={selectedSimulator.ws_scrcpy_url} target="_blank" rel="noopener noreferrer">
                                        <GlobalOutlined /> 点击跳转播放器
                                    </a>
                                ) : '未配置'}
                            </Descriptions.Item>
                            <Descriptions.Item label="控制端 API">
                                <span style={{ fontSize: '12px', color: '#666' }}>{selectedSimulator.remote_control_url}</span>
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider orientation="left" plain>服务测试</Divider>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Button
                                type="primary"
                                icon={<SafetyOutlined />}
                                loading={testLoading[selectedSimulator.id]}
                                onClick={() => handleTestConnection(selectedSimulator.remote_control_url, selectedSimulator.id)}
                            >
                                测试后端连通性
                            </Button>
                        </div>

                        <Divider orientation="left" plain>管理操作</Divider>
                        <Space size="middle" wrap style={{ width: '100%', justifyContent: 'center', marginBottom: 24 }}>
                            <Button icon={<EditOutlined />} onClick={() => handleEdit(selectedSimulator)}>编辑信息</Button>
                            <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(selectedSimulator)}>删除模拟器</Button>
                        </Space>
                    </div>
                )}
            </Drawer>

            <Modal
                title={editingSimulator ? '编辑模拟器' : '新建模拟器'}
                open={modalVisible}
                onOk={handleModalOk}
                confirmLoading={confirmLoading}
                onCancel={() => setModalVisible(false)}
                width={isMobile ? '95%' : 600}
                centered={isMobile}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入模拟器名称' }]}>
                        <Input placeholder="给您的模拟器起个名字" />
                    </Form.Item>
                    <Form.Item name="emulator_id" label="模拟器ID" tooltip="MuMu 内的虚拟机实例 ID (如 0, 1...)">
                        <Input placeholder="0" />
                    </Form.Item>
                    <Form.Item name="ws_scrcpy_url" label="WebVNC(ws-scrcpy) 播放器 URL">
                        <Input placeholder="http://ip:8000/" />
                    </Form.Item>
                    <Form.Item
                        label="远程控制端 API 地址"
                        required
                        tooltip="这是云端后端用来控制该机器的地址，需确保云端网络可访问该机器的端口"
                    >
                        <Space.Compact style={{ width: '100%' }}>
                            <Form.Item
                                name="remote_control_url"
                                noStyle
                                initialValue="http://10.31.3.15:8011"
                                rules={[{ required: true, message: '请输入控制端 URL' }]}
                            >
                                <Input placeholder="http://10.31.3.15:8011" />
                            </Form.Item>
                            <Button
                                type="primary"
                                onClick={() => handleTestConnection(form.getFieldValue('remote_control_url'))}
                                loading={testLoading['manual']}
                            >
                                测试连通性
                            </Button>
                        </Space.Compact>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SimulatorManagement;
