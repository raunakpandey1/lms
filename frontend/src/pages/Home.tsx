import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <section className="page">
      <h1>Learning Management System</h1>
      <p>
        A simple LMS where instructors create courses and students join and read
        chapters.
      </p>

      {!isAuthenticated && (
        <div className="actions">
          <Link to="/login" className="button-link">
            Login
          </Link>
          <Link to="/register" className="button-link secondary">
            Register
          </Link>
        </div>
      )}

      {isAuthenticated && user?.role === "instructor" && (
        <Link to="/instructor/dashboard" className="button-link">
          Go to Instructor Dashboard
        </Link>
      )}

      {isAuthenticated && user?.role === "student" && (
        <Link to="/student/dashboard" className="button-link">
          Go to Student Dashboard
        </Link>
      )}
    </section>
  );
}