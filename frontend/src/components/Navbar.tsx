import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">
        LMS
      </Link>

      <div className="nav-links">
        {isAuthenticated && user?.role === "instructor" && (
          <Link to="/instructor/dashboard">Dashboard</Link>
        )}

        {isAuthenticated && user?.role === "student" && (
          <Link to="/student/dashboard">Dashboard</Link>
        )}

        {!isAuthenticated && <Link to="/login">Login</Link>}
        {!isAuthenticated && <Link to="/register">Register</Link>}

        {isAuthenticated && (
          <>
            <span className="nav-user">
              {user?.username} ({user?.role})
            </span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}