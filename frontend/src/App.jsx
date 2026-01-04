import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ApiProvider from './utils/request';
import Login from './pages/Login';
import MainLayout from './components/Layout/MainLayout';
import PrivateRoute from './components/PrivateRoute';
import UserManagement from './pages/Admin/UserManagement';
import InstanceManagement from './pages/Admin/InstanceManagement';
import Dashboard from './pages/User/Dashboard';
import ChangePassword from './pages/User/ChangePassword';

// Inner component to consume ThemeContext and apply ConfigProvider
const AppContent = () => {
  const { isDarkMode } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#007AFF', // Apple Blue
          borderRadius: 8,
          fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
          wireframe: false,
        },
        components: {
            Layout: {
                bodyBg: 'transparent',
                headerBg: 'transparent',
                siderBg: 'transparent',
            },
            Menu: {
                itemBorderRadius: 8,
                itemMarginInline: 8,
                activeBarBorderWidth: 0, // Remove side bar on active item
                itemSelectedBg: isDarkMode ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)',
                itemSelectedColor: '#007AFF',
            },
            Card: {
                borderRadiusLG: 16,
            }
        }
      }}
    >
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                
                {/* User Routes */}
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<ChangePassword />} />
                
                {/* Admin Routes */}
                <Route path="admin">
                    <Route 
                    path="users" 
                    element={
                        <PrivateRoute requireAdmin>
                        <UserManagement />
                        </PrivateRoute>
                    } 
                    />
                    <Route 
                    path="instances" 
                    element={
                        <PrivateRoute requireAdmin>
                        <InstanceManagement />
                        </PrivateRoute>
                    } 
                    />
                </Route>
                </Route>
                
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </AuthProvider>
    </ConfigProvider>
  );
}

function App() {
  return (
    <Router>
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    </Router>
  );
}

export default App;
