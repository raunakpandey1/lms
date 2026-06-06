import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function UserIcon() {
  return (
    <span className="profile-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img">
        <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5Zm0 2c-3.31 0-8 1.67-8 5v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1c0-3.33-4.69-5-8-5Z" />
      </svg>
    </span>
  );
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === "instructor" ? "/instructor/dashboard" : "/student/dashboard";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo" aria-label="Go to LMS home">
        <span className="nav-logo-mark">L</span>
        <span>LMS</span>
      </Link>

      <div className="nav-links">
        {isAuthenticated && (
          <Link to={dashboardPath} className="nav-link">
            Dashboard
          </Link>
        )}

        <div className="profile-menu">
          <button type="button" className="profile-trigger" aria-haspopup="true">
            <UserIcon />
            <span>{isAuthenticated ? user?.username : "Login"}</span>
            <span className="profile-caret" aria-hidden="true">
              ▾
            </span>
          </button>

          <div className="profile-dropdown" role="menu">
            {isAuthenticated ? (
              <>
                <div className="profile-card">
                  <UserIcon />
                  <div>
                    <strong>{user?.username}</strong>
                    {user?.email && <span>{user.email}</span>}
                    <small>{user?.role}</small>
                  </div>
                </div>

                <button
                  type="button"
                  className="dropdown-action danger-text"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="dropdown-action primary-action" role="menuitem">
                  Login
                </Link>
                <Link to="/register" className="dropdown-action" role="menuitem">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
