import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getCourses, getMyCourses, joinCourse } from "../api/courseApi";
import { useAuth } from "../context/AuthContext";
import type { Course } from "../types/course";

export function StudentDashboard() {
  const { user } = useAuth();

  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [joinedCourses, setJoinedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningCourseId, setJoiningCourseId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const joinedCourseIds = useMemo(() => {
    return new Set(joinedCourses.map((course) => course.id));
  }, [joinedCourses]);

  async function loadCourses() {
    try {
      setIsLoading(true);

      const [courses, myCourses] = await Promise.all([
        getCourses(),
        getMyCourses(),
      ]);

      setAvailableCourses(courses);
      setJoinedCourses(myCourses);
    } catch {
      setError("Failed to load courses.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCourses();
  }, []);

  async function handleJoin(courseId: number) {
    setError("");
    setSuccessMessage("");
    setJoiningCourseId(courseId);

    try {
      await joinCourse(courseId);
      setSuccessMessage("Course joined successfully.");
      await loadCourses();
    } catch {
      setError("Could not join this course. You may already be enrolled.");
    } finally {
      setJoiningCourseId(null);
    }
  }

  return (
    <section className="page">
      <h1>Student Dashboard</h1>
      <p>Welcome, {user?.username}. Browse and join available courses.</p>

      {error && <p className="error">{error}</p>}
      {successMessage && <p className="success">{successMessage}</p>}

      <div className="card">
        <h2>My Joined Courses</h2>

        {isLoading && <p>Loading courses...</p>}

        {!isLoading && joinedCourses.length === 0 && (
          <p>You have not joined any courses yet.</p>
        )}

        <div className="course-grid">
          {joinedCourses.map((course) => (
            <article key={course.id} className="course-card">
              <h3>{course.title}</h3>
              <p>{course.description || "No description provided."}</p>
              <p className="muted">Instructor: {course.instructor_name}</p>
              <Link
                to={`/courses/${course.id}/chapters`}
                className="small-link-button"
              >
                View Chapters
              </Link>
            </article>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Available Courses</h2>

        {isLoading && <p>Loading courses...</p>}

        {!isLoading && availableCourses.length === 0 && (
          <p>No published courses are available right now.</p>
        )}

        <div className="course-grid">
          {availableCourses.map((course) => {
            const alreadyJoined = joinedCourseIds.has(course.id);

            return (
              <article key={course.id} className="course-card">
                <h3>{course.title}</h3>
                <p>{course.description || "No description provided."}</p>
                <p className="muted">Instructor: {course.instructor_name}</p>

                <button
                  type="button"
                  disabled={alreadyJoined || joiningCourseId === course.id}
                  onClick={() => handleJoin(course.id)}
                >
                  {alreadyJoined
                    ? "Already Joined"
                    : joiningCourseId === course.id
                      ? "Joining..."
                      : "Join Course"}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
