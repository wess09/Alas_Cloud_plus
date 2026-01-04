import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ApiProvider from './utils/request';
import Login from './pages/Login';
import MainLayout from './components/Layout/MainLayout';
import PrivateRoute from './components/PrivateRoute';

// Admin Pages
import UserManagement from './pages/Admin/UserManagement';
import InstanceManagement from './pages/Admin/InstanceManagement';

// User Pages
import Dashboard from './pages/User/Dashboard';
import ChangePassword from './pages/User/ChangePassword';

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
