// src/routes/ProtectedRoute.tsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { hasPermission } from "../Utils/auth";
import { Permission } from "../config/permissions";

type ProtectedRouteProps = {
  children: JSX.Element;
  redirectPath?: string;
  checkAuthAsync?: () => Promise<boolean>;
  action?: Permission;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectPath = "/home",
  checkAuthAsync,
  action,
}) => {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  const getSyncAccess = () => {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return false;
    try {
      const user = JSON.parse(rawUser);
      const validUser = !!user && typeof user === "object" && (user.id != null || !!user.email);
      if (!validUser) return false;
      if (action) return hasPermission(user.role, action);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (checkAuthAsync) {
      const asyncAuthCheck = async () => {
        try {
          const authenticated = await checkAuthAsync();
          setIsAllowed(authenticated);
        } catch (error) {
          setIsAllowed(false);
        }
      };
      asyncAuthCheck();
    }
  }, [checkAuthAsync]);

  if (!checkAuthAsync) {
    return getSyncAccess() ? children : <Navigate to={redirectPath} replace />;
  }

  if (isAllowed === null) {
    return <div>Loading...</div>;
  }

  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
