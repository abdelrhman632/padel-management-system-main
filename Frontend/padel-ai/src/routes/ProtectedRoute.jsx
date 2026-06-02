import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
	const { user } = useAuth();
	const location = useLocation();

	if (!user) {
		return <Navigate to="/signin" replace state={{ from: location }} />;
	}

	return children;
}