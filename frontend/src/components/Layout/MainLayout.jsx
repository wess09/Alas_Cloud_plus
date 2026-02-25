import { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Tooltip, Avatar, Dropdown, Drawer, Grid } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  CloudServerOutlined,
  TeamOutlined,
  KeyOutlined,
  BulbOutlined,
  BugOutlined,
  SettingOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SunOutlined,
  MoonOutlined,
  MobileOutlined,
  MenuOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const screens = useBreakpoint();
  const isMobile = screens.md === false; // md is 768px

  const { user, logout, isAdmin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) {
      setMobileVisible(false);
    }
  };

  const getMenuItems = () => {
    const items = [];

    if (isAdmin) {
      items.push({
        key: 'grp-admin',
        label: '管理控制台',
        type: 'group',
        children: [
          {
            key: '/admin/users',
            icon: <TeamOutlined />,
            label: '用户管理',
          },
          {
            key: '/admin/instances',
            icon: <CloudServerOutlined />,
            label: '实例管理',
          },
          {
            key: '/admin/simulators',
            icon: <MobileOutlined />,
            label: '模拟器管理',
          }
        ]
      });
    }

    items.push({
      key: 'grp-user',
      label: '个人中心',
      type: 'group',
      children: [
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: '我的实例',
        },
        {
          key: '/simulators',
          icon: <MobileOutlined />,
          label: '我的模拟器',
        },
        {
          key: '/profile',
          icon: <KeyOutlined />,
          label: '修改密码',
        }
      ]
    });

    return items;
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: '个人资料',
        icon: <UserOutlined />,
        onClick: () => navigate('/profile')
      },
      {
        type: 'divider'
      },
      {
        key: 'logout',
        label: '退出系统',
        icon: <LogoutOutlined />,
        danger: true,
        onClick: () => {
          logout();
          navigate('/login');
        }
      }
    ]
  };

  const Logo = ({ isCollapsed }) => (
    <div style={{
      height: 64,
      margin: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      transition: 'all 0.3s'
    }}>
      <img src="/icon.svg" alt="logo" style={{ width: 32, height: 32, flexShrink: 0 }} />
      {!isCollapsed && (
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 900,
          fontSize: '18px',
          background: 'linear-gradient(to right, #00C6FB, #005BEA)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          whiteSpace: 'nowrap',
          letterSpacing: '1px'
        }}>
          ALAS CLOUD
        </span>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          trigger={null}
          width={240}
          className="glass-sidebar"
          style={{
            zIndex: 10,
            boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
            borderRight: '1px solid var(--glass-border)',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0
          }}
        >
          <Logo isCollapsed={collapsed} />
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={getMenuItems()}
            onClick={handleMenuClick}
            style={{
              background: 'transparent',
              borderRight: 'none',
              padding: '0 8px'
            }}
            theme={isDarkMode ? 'dark' : 'light'}
          />
          <div style={{
            position: 'absolute',
            bottom: 16,
            width: '100%',
            textAlign: 'center',
            padding: '0 16px'
          }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: 'var(--text-color)', width: '100%' }}
            />
          </div>
        </Sider>
      )}

      <Drawer
        placement="left"
        onClose={() => setMobileVisible(false)}
        open={mobileVisible}
        width={240}
        styles={{ body: { padding: 0 } }}
        className="glass-drawer"
      >
        <Logo isCollapsed={false} />
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            borderRight: 'none',
            padding: '0 8px'
          }}
          theme={isDarkMode ? 'dark' : 'light'}
        />
      </Drawer>

      <Layout style={{
        background: 'transparent',
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 240),
        transition: 'margin-left 0.3s'
      }}>
        <Header style={{
          padding: isMobile ? '0 16px' : '0 24px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 72,
          borderBottom: '1px solid var(--glass-border)',
          position: 'sticky',
          top: 0,
          zIndex: 9
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileVisible(true)}
                style={{ fontSize: '18px' }}
              />
            )}
            <h2 style={{ margin: 0, fontSize: isMobile ? '16px' : '20px', fontWeight: 600 }}>
              {/* Dynamic title if needed */}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
            <Tooltip title={isDarkMode ? "切换到亮色模式" : "切换到暗色模式"}>
              <Button
                type="text"
                shape="circle"
                icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                style={{ fontSize: '18px' }}
              />
            </Tooltip>

            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '4px' : '12px',
                cursor: 'pointer',
                padding: '8px 4px',
                borderRadius: '8px',
                transition: 'background 0.3s'
              }} className="user-dropdown-trigger">
                <Avatar
                  size={isMobile ? "small" : "default"}
                  style={{ backgroundColor: '#007AFF' }}
                  icon={<UserOutlined />}
                />
                {!isMobile && (
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ fontWeight: 600 }}>{user?.username}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>
                      {isAdmin ? '管理员' : '用户'}
                    </div>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: isMobile ? '16px 16px' : '24px 24px', overflow: 'initial' }}>
          <div className="fade-in-content" style={{ minHeight: 360 }}>
            <Outlet />
          </div>
        </Content>

        <Layout.Footer style={{ textAlign: 'center', background: 'transparent', padding: '24px 0' }}>
          <span style={{ opacity: 0.6 }}>Alas Cloud ©{new Date().getFullYear()} Created by Azur</span>
        </Layout.Footer>
      </Layout>

      <style>{`
        .user-dropdown-trigger:hover {
            background: rgba(150,150,150,0.1);
        }
        .fade-in-content {
            animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Layout>
  );
};

export default MainLayout;
