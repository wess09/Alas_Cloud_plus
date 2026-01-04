import { useState } from 'react';
import { Layout, Menu, Button, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  CloudServerOutlined,
  TeamOutlined,
  KeyOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else {
      navigate(key);
    }
  };

  const getMenuItems = () => {
    const items = [];
    
    // 公共菜单
    // items.push({
    //   key: '/dashboard',
    //   icon: <DashboardOutlined />,
    //   label: '概览',
    // });

    if (isAdmin) {
      // 管理员菜单
      items.push({
        key: '/admin/users',
        icon: <TeamOutlined />,
        label: '用户管理',
      });
      items.push({
        key: '/admin/instances',
        icon: <CloudServerOutlined />,
        label: '实例管理',
      });
    } else {
      // 普通用户菜单
      items.push({
        key: '/dashboard',
        icon: <CloudServerOutlined />,
        label: '我的实例',
      });
      items.push({
        key: '/profile',
        icon: <KeyOutlined />,
        label: '修改密码',
      });
    }

    return items;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
          {!collapsed ? 'Alas Cloud' : 'AC'}
        </div>
        <Menu 
          theme="dark" 
          defaultSelectedKeys={[location.pathname]} 
          mode="inline" 
          items={getMenuItems()} 
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>
              <UserOutlined style={{ marginRight: 8 }} />
              {user?.username} ({isAdmin ? '管理员' : '用户'})
            </span>
            <Button type="text" icon={<LogoutOutlined />} onClick={() => { logout(); navigate('/login'); }}>
              退出
            </Button>
          </div>
        </Header>
        <Content style={{ margin: '16px 16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
        <Layout.Footer style={{ textAlign: 'center' }}>
          Alas Cloud ©{new Date().getFullYear()} Created by Azur
        </Layout.Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
