import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { isAuthenticated, user, token } = useAuth();
  const location = useLocation();

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user && user.role !== 'admin' && user.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
