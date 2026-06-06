import { Link } from "react-router-dom";

import studentStudyingImage from "../assets/student-studying.svg";
import { useAuth } from "../context/AuthContext";

export function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <section className="page home-hero">
      <div className="home-hero-visual" aria-hidden="true">
        <img src={studentStudyingImage} alt="" />
      </div>

      <div className="home-hero-content">
        
        <h1>Learning Management System</h1>
        <p>
          A platform where instructors create courses and students join and
          read chapters.
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
      </div>
    </section>
  );
}
