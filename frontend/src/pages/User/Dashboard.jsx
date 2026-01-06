import { useState, useEffect } from 'react';
import { Row, Col, Typography, Button, Spin, Empty, Tooltip, Modal, message } from 'antd';
import { GlobalOutlined, LinkOutlined, RightOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../utils/request';

const { Title, Paragraph, Text } = Typography;

const Dashboard = () => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restartingId, setRestartingId] = useState(null);

  useEffect(() => {
    const fetchInstances = async () => {
      try {
        const data = await api.get('/user/instances');
        setInstances(data);
      } catch (error) {
        console.error('获取实例列表失败', error);
      }
      setLoading(false);
    };

    fetchInstances();
  }, []);

  const handleRestart = (instance) => {
    Modal.confirm({
      title: '确认重启',
      content: `确定要重启实例 "${instance.name}" 吗？这可能需要几秒钟时间。`,
      okText: '重启',
      cancelText: '取消',
      onOk: async () => {
        try {
          setRestartingId(instance.id);
          await api.post(`/user/instances/${instance.id}/restart`, {}, { timeout: 60000 });
          message.success(`实例 "${instance.name}" 重启成功`);
        } catch (error) {
          // Error is handled by interceptor, but we can add specific handling if needed
          if (error.code === 'ECONNABORTED') {
             message.warning('重启请求超时，但在后台可能仍在进行，请稍后刷新查看状态。');
          } else {
             console.error('Restart failed', error);
          }
        } finally {
          setRestartingId(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text strong style={{ fontSize: 16 }}>暂无分配的实例</Text>
              <Text type="secondary">请联系管理员为您分配实例访问权限</Text>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>我的实例</Title>
        <Text type="secondary" style={{ fontSize: 16, marginTop: 8, display: 'block' }}>
            管理并访问您的 Alas Cloud 实例
        </Text>
      </div>
      
      <Row gutter={[24, 24]}>
        {instances.map((instance) => (
          <Col xs={24} sm={12} md={8} lg={6} key={instance.id}>
            <div className="glass-panel instance-card">
                {/* Header */}
                <div className="card-header">
                    <div style={{ 
                        width: 42, 
                        height: 42, 
                        borderRadius: 10, 
                        background: 'linear-gradient(135deg, #007AFF 0%, #00C6FB 100%)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 20,
                        boxShadow: '0 4px 10px rgba(0,122,255,0.3)'
                    }}>
                        <GlobalOutlined />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tooltip title={instance.name}>
                                <div style={{ 
                                    fontWeight: 600, 
                                    fontSize: 16, 
                                    whiteSpace: 'nowrap', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis' 
                                }}>
                                    {instance.name}
                                </div>
                            </Tooltip>
                            {/* Health Indicator */}
                            <Tooltip title={`健康状态: ${instance.health_status === 'healthy' ? '正常' : instance.health_status === 'unhealthy' ? '异常' : '未知'}`}>
                                <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: instance.health_status === 'healthy' ? '#52c41a' : instance.health_status === 'unhealthy' ? '#ff4d4f' : '#d9d9d9',
                                    boxShadow: instance.health_status === 'healthy' ? '0 0 6px #52c41a' : instance.health_status === 'unhealthy' ? '0 0 6px #ff4d4f' : 'none'
                                }} />
                            </Tooltip>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                            ID: {instance.id}
                        </div>
                    </div>
                    {/* Restart Button */}
                    <Tooltip title="重启实例">
                      <Button
                        type="text"
                        shape="circle"
                        icon={<ReloadOutlined spin={restartingId === instance.id} />}
                        onClick={() => handleRestart(instance)}
                        disabled={restartingId === instance.id}
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      />
                    </Tooltip>
                </div>

                {/* Body */}
                <div className="card-body">
                    <Paragraph 
                        ellipsis={{ rows: 3 }} 
                        style={{ margin: 0, opacity: 0.8, fontSize: 14, minHeight: '4.5em' }}
                    >
                        {instance.description || '暂无描述信息'}
                    </Paragraph>
                </div>

                {/* Footer */}
                <div className="card-footer">
                    <Button 
                        type="primary" 
                        href={instance.url} 
                        target="_blank"
                        block
                        style={{
                            height: 40,
                            borderRadius: 20,
                            fontWeight: 600,
                            background: '#007AFF', // Standard Blue
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(0,122,255,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s'
                        }}
                    >
                        访问实例 <RightOutlined style={{ fontSize: 12, marginLeft: 4 }} />
                    </Button>
                </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Dashboard;
