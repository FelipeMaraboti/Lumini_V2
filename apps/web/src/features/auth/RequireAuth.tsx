import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface RequireAuthProps {
  permission?: string;
}

export function RequireAuth({ permission }: RequireAuthProps) {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission && !hasPermission(permission) && !hasPermission('organization.manage')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
