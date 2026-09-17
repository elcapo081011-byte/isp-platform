import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
export function RequireAuth({ children }) {
    const accessToken = useAuthStore((s) => s.accessToken);
    if (!accessToken)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
