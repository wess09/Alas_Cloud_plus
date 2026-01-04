import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const onFinish = async (values) => {
    setLoading(true);
    // Simulate a slight delay for better UX feeling
    setTimeout(async () => {
      try {
        const success = await login(values.username, values.password);
        if (success) {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        } else {
             message.error("登录失败，请检查用户名或密码");
        }
      } catch (error) {
        message.error("登录出错");
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const bgGradient = isDarkMode 
    ? 'linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #1a1a2e)' 
    : 'linear-gradient(-45deg, #007AFF, #00C6FB, #005BEA, #007AFF)';
    
  const glassBg = isDarkMode
    ? 'rgba(30, 30, 30, 0.65)'
    : 'rgba(255, 255, 255, 0.7)';
    
  const glassBorder = isDarkMode
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(255, 255, 255, 0.5)';

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundImage: bgGradient, 
      backgroundSize: '200% 200%',
      animation: 'gradient 15s ease infinite',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Theme Toggle */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
        <Button
          type="text"
          shape="circle"
          icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
          style={{ 
            color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)',
            background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)'
          }}
        />
      </div>

      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '30vw',
        height: '30vw',
        background: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        zIndex: 0,
        animation: 'float 20s infinite ease-in-out'
      }} />
       <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '25vw',
        height: '25vw',
        background: isDarkMode ? 'rgba(0, 122, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        zIndex: 0,
        animation: 'float 25s infinite ease-in-out reverse'
      }} />

      <div className="glass-panel" style={{ 
        width: 420, 
        padding: '48px 32px',
        zIndex: 1,
        textAlign: 'center',
        background: glassBg,
        backdropFilter: 'blur(40px)',
        border: glassBorder
      }}>
        <div style={{ marginBottom: 32 }}>
            <div style={{ 
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <img src="/icon.svg" alt="logo" style={{ width: 80, height: 80, filter: 'drop-shadow(0 8px 16px rgba(0, 122, 255, 0.3))' }} />
            </div>
            
          <Title level={2} style={{ 
              marginBottom: 8, 
              fontFamily: "'Orbitron', sans-serif", 
              fontWeight: 700,
              letterSpacing: '1px'
          }}>Alas Cloud Plus</Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>欢迎回来，请登录您的账户</Text>
        </div>
        
        <Form
          name="normal_login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
                prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.4)' }} />} 
                placeholder="用户名" 
                style={{ 
                    borderRadius: '12px', 
                    padding: '10px 16px',
                    background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.4)' }} />}
              placeholder="密码"
              style={{ 
                    borderRadius: '12px', 
                    padding: '10px 16px',
                    background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}
            />
          </Form.Item>

          <Form.Item>
            <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                style={{
                    height: '48px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    background: '#007AFF', // Apple Blue
                    boxShadow: '0 4px 12px rgba(0,122,255,0.3)',
                    border: 'none',
                    marginTop: '8px'
                }}
            >
              登 录 <ArrowRightOutlined />
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ marginTop: 24 }}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
                Alas Cloud Plus &copy; {new Date().getFullYear()}
            </Text>
        </div>
      </div>
      
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(20px, 20px) rotate(10deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
