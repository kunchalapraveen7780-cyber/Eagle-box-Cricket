import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    return <Navigate to="/login/customer" replace />;
  }

  let isExpired = false;
  try {
    const decoded = jwtDecode(token);
    // eslint-disable-next-line react-hooks/purity
    if (decoded.exp * 1000 < Date.now()) {
      isExpired = true;
    }
  } catch {
    isExpired = true;
  }

  if (isExpired) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login/customer" replace />;
  }

  let parsedUser;
  try {
    parsedUser = JSON.parse(user);
  } catch {
    return <Navigate to="/login/customer" replace />;
  }

  if (requiredRole && parsedUser.role !== requiredRole) {
    return <Navigate to="/customer/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
