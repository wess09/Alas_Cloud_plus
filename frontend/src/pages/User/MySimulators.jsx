import { useState, useEffect } from 'react';
import { Card, Button, message, Spin, Row, Col, Typography, Empty, Space, Grid } from 'antd';
import {
    SyncOutlined,
    CaretRightOutlined,
    PoweroffOutlined,
    LinkOutlined
} from '@ant-design/icons';
import api from '../../utils/request';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const MySimulators = () => {
    const [simulators, setSimulators] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({}); // { 'id_action': boolean }
    const screens = useBreakpoint();
    const isMobile = screens.sm === false;

    const fetchSimulators = async () => {
        setLoading(true);
        try {
            const data = await api.get('/user/simulators');
            setSimulators(data);
        } catch (error) {
            console.error('获取我的模拟器失败', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSimulators();
    }, []);

    const handleControl = async (id, action) => {
        const loadingKey = `${id}_${action}`;
        setActionLoading(prev => ({ ...prev, [loadingKey]: true }));
        try {
            await api.post(`/user/simulators/${id}/${action}`);
            const actionText = action === 'start' ? '启动' : (action === 'stop' ? '关机' : '重启');
            message.success(`已发送${actionText}指令`);
        } catch (error) {
            // error handled by request util
        }
        setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
    };

    if (loading && simulators.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (simulators.length === 0) {
        return (
            <div>
                <h2 style={{ marginBottom: 24, fontSize: isMobile ? '18px' : '24px' }}>我的模拟器</h2>
                <Card>
                    <Empty description="暂无分配给您的模拟器" />
                </Card>
            </div>
        );
    }

    return (
        <div>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                marginBottom: 24,
                gap: 12
            }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '24px' }}>我的模拟器</h2>
                <Button
                    icon={<SyncOutlined rotate={loading ? 180 : 0} />}
                    onClick={fetchSimulators}
                    loading={loading}
                    block={isMobile}
                >
                    刷新状态
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                {simulators.map((simulator) => (
                    <Col xs={24} xl={12} key={simulator.id}>
                        <Card
                            title={
                                <div style={{
                                    display: 'flex',
                                    flexDirection: isMobile ? 'column' : 'row',
                                    justifyContent: 'space-between',
                                    alignItems: isMobile ? 'flex-start' : 'center',
                                    padding: isMobile ? '8px 0' : 0,
                                    gap: 8
                                }}>
                                    <span style={{ fontWeight: 600 }}>{simulator.name}</span>
                                    <Space direction="vertical" style={{ width: isMobile ? '100%' : 'auto' }} size={0}>
                                        <Space wrap>
                                            <Button
                                                type="primary"
                                                icon={<CaretRightOutlined />}
                                                size={isMobile ? "middle" : "small"}
                                                loading={actionLoading[`${simulator.id}_start`]}
                                                onClick={() => handleControl(simulator.id, 'start')}
                                                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', flex: isMobile ? 1 : 'none' }}
                                            >
                                                开机
                                            </Button>
                                            <Button
                                                type="primary"
                                                danger
                                                icon={<PoweroffOutlined />}
                                                size={isMobile ? "middle" : "small"}
                                                loading={actionLoading[`${simulator.id}_stop`]}
                                                onClick={() => handleControl(simulator.id, 'stop')}
                                                style={{ flex: isMobile ? 1 : 'none' }}
                                            >
                                                关机
                                            </Button>
                                            <Button
                                                icon={<SyncOutlined />}
                                                size={isMobile ? "middle" : "small"}
                                                loading={actionLoading[`${simulator.id}_restart`]}
                                                onClick={() => handleControl(simulator.id, 'restart')}
                                                style={{ flex: isMobile ? 1 : 'none' }}
                                            >
                                                重启
                                            </Button>
                                        </Space>
                                        {simulator.remote_control_url && (
                                            <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>
                                                <LinkOutlined /> 控制端: {simulator.remote_control_url}
                                            </div>
                                        )}
                                    </Space>
                                </div>
                            }
                            bordered={false}
                            style={{
                                height: '100%',
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '16px',
                                overflow: 'hidden'
                            }}
                            styles={{
                                body: { padding: 0 }
                            }}
                        >
                            <div style={{ background: '#000', width: '100%', aspectRatio: isMobile ? '4/3' : '16/9', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                {simulator.ws_scrcpy_url ? (
                                    <iframe
                                        src={simulator.ws_scrcpy_url}
                                        title={simulator.name}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        allowFullScreen
                                    />
                                ) : (
                                    <Text type="secondary" style={{ color: '#888' }}>未配置实时画面 URL</Text>
                                )}
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default MySimulators;
