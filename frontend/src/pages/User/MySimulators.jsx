import { useState, useEffect, useRef } from 'react';
import { Card, Button, Spin, Row, Col, Typography, Empty, Space, Grid, App } from 'antd';
import {
    SyncOutlined,
    CaretRightOutlined,
    PoweroffOutlined,
    LinkOutlined,
    ReloadOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined
} from '@ant-design/icons';
import api from '../../utils/request';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const MySimulators = () => {
    const { message } = App.useApp();
    const [simulators, setSimulators] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({}); // { 'id_action': boolean }
    const screens = useBreakpoint();
    const isMobile = screens.sm === false;

    // Fullscreen state and refs
    const [isFullscreen, setIsFullscreen] = useState({});
    const playerRefs = useRef({});

    const fetchSimulators = async () => {
        setLoading(true);
        try {
            const data = await api.get('/user/simulators');
            setSimulators(data);
        } catch (error) {
            console.error('获取我的模拟器失败', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSimulators();
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const currentFullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
            const updatedFullscreenState = {};
            simulators.forEach(sim => {
                const element = playerRefs.current[sim.id];
                updatedFullscreenState[sim.id] = currentFullscreenElement === element;
            });
            setIsFullscreen(updatedFullscreenState);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [simulators]);

    const toggleFullscreen = async (id) => {
        const element = playerRefs.current[id];
        if (!element) return;

        try {
            if (!isFullscreen[id]) {
                if (element.requestFullscreen) {
                    await element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    await element.webkitRequestFullscreen();
                } else if (element.mozRequestFullScreen) {
                    await element.mozRequestFullScreen();
                } else if (element.msRequestFullscreen) {
                    await element.msRequestFullscreen();
                }

                // 尝试锁定横屏（主要针对移动端设备）
                if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
                    try {
                        await window.screen.orientation.lock('landscape');
                    } catch (err) {
                        console.warn('横屏锁定失败:', err);
                    }
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    await document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    await document.msExitFullscreen();
                }

                // 取消屏幕旋转锁定
                if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                    window.screen.orientation.unlock();
                }
            }
        } catch (error) {
            console.error('全屏操作失败:', error);
            message.error('无法切换全屏状态');
        }
    };

    const handleControl = async (id, action) => {
        const loadingKey = `${id}_${action}`;
        setActionLoading(prev => ({ ...prev, [loadingKey]: true }));
        try {
            await api.post(`/user/simulators/${id}/${action}`);
            if (action === 'start' || action === 'restart') {
                const actionText = action === 'start' ? '启动' : '重启';
                message.success({
                    content: `已发送${actionText}指令，开机或重启需要等待至少3分钟才能恢复画面显示。`,
                    duration: 5, // 提示框停留 5 秒让用户看清
                });
            } else {
                message.success('已发送关机指令');
            }
        } catch (error) {
            // error handled by request util
        }
        setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
    };

    const [iframeKeys, setIframeKeys] = useState({}); // { id: number }

    const handleRefreshIframe = (id) => {
        setIframeKeys(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
        message.info('正在尝试重新连接画面...');
    };

    if (loading && simulators.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
                <Spin size="large" tip="加载模拟器中...">
                    <div style={{ padding: '50px' }} />
                </Spin>
            </div>
        );
    }

    if (simulators.length === 0) {
        return (
            <div style={{ padding: isMobile ? '0' : '0 12px' }}>
                <h2 style={{ marginBottom: 24, fontSize: isMobile ? '18px' : '24px' }}>我的模拟器</h2>
                <Card variant="borderless" className="glass-card">
                    <Empty description="暂无分配给您的模拟器" />
                </Card>
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '0' : '0 12px' }}>
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
                    icon={<SyncOutlined spin={loading} />}
                    onClick={fetchSimulators}
                    disabled={loading}
                    block={isMobile}
                    className="glass-button"
                >
                    刷新状态
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                {simulators.map((simulator) => (
                    <Col xs={24} key={simulator.id}>
                        <Card
                            title={
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '12px 0',
                                    gap: 12
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: '18px' }}>{simulator.name}</span>
                                        <Space>
                                            <Button
                                                size="small"
                                                icon={<ReloadOutlined />}
                                                onClick={() => handleRefreshIframe(simulator.id)}
                                            >
                                                刷新画面
                                            </Button>
                                            <Button
                                                size="small"
                                                type={isFullscreen[simulator.id] ? "primary" : "default"}
                                                icon={isFullscreen[simulator.id] ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                                                onClick={() => toggleFullscreen(simulator.id)}
                                            >
                                                全屏
                                            </Button>
                                        </Space>
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        <Button
                                            type="primary"
                                            icon={<CaretRightOutlined />}
                                            loading={actionLoading[`${simulator.id}_start`]}
                                            onClick={() => handleControl(simulator.id, 'start')}
                                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                        >
                                            开机
                                        </Button>
                                        <Button
                                            type="primary"
                                            danger
                                            icon={<PoweroffOutlined />}
                                            loading={actionLoading[`${simulator.id}_stop`]}
                                            onClick={() => handleControl(simulator.id, 'stop')}
                                        >
                                            关机
                                        </Button>
                                        <Button
                                            icon={<SyncOutlined />}
                                            loading={actionLoading[`${simulator.id}_restart`]}
                                            onClick={() => handleControl(simulator.id, 'restart')}
                                        >
                                            重启
                                        </Button>
                                    </div>

                                    {simulator.remote_control_url && (
                                        <div style={{ fontSize: '11px', color: '#8c8c8c', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                                            <LinkOutlined /> 控制端: {simulator.remote_control_url}
                                        </div>
                                    )}
                                </div>
                            }
                            variant="borderless"
                            className="glass-card"
                            style={{ overflow: 'hidden', borderRadius: '12px' }}
                            styles={{ body: { padding: 0 } }}
                        >
                            <div
                                ref={el => playerRefs.current[simulator.id] = el}
                                style={{
                                    background: '#000',
                                    width: '100%',
                                    aspectRatio: '1280/720',
                                    minHeight: isMobile ? 'auto' : '300px',
                                    maxHeight: isFullscreen[simulator.id] ? '100vh' : (isMobile ? '40vh' : '65vh'),
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    position: 'relative'
                                }}
                            >
                                {simulator.ws_scrcpy_url ? (
                                    <iframe
                                        key={iframeKeys[simulator.id] || 0}
                                        src={simulator.ws_scrcpy_url}
                                        title={simulator.name}
                                        style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
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
