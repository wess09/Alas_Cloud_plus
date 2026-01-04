import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Spin, Empty } from 'antd';
import { GlobalOutlined, LinkOutlined } from '@ant-design/icons';
import api from '../../utils/request';

const { Title, Paragraph } = Typography;

const Dashboard = () => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span>
            暂无分配的实例
            <br />
            <small style={{ color: '#999' }}>请联系管理员为您分配实例访问权限</small>
          </span>
        }
      />
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>我的实例</Title>
      <Row gutter={[24, 24]}>
        {instances.map((instance) => (
          <Col xs={24} sm={12} md={8} lg={6} key={instance.id}>
            <Card
              hoverable
              title={
                <span>
                  <GlobalOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  {instance.name}
                </span>
              }
              actions={[
                <Button 
                  type="primary" 
                  icon={<LinkOutlined />} 
                  href={instance.url} 
                  target="_blank"
                  block
                >
                  访问实例
                </Button>
              ]}
              style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1 }}
            >
              <Paragraph ellipsis={{ rows: 3 }}>
                {instance.description || '暂无描述'}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Dashboard;
