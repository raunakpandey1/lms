import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  createCourse,
  deleteCourse,
  getCourses,
  updateCourse,
} from "../api/courseApi";
import { useAuth } from "../context/AuthContext";
import type { Course } from "../types/course";

export function InstructorDashboard() {
  const { user } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadCourses() {
    try {
      setIsLoading(true);
      const allCourses = await getCourses();

      const myCourses = allCourses.filter(
        (course) => course.instructor === user?.id,
      );

      setCourses(myCourses);
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

  function resetForm() {
    setTitle("");
    setDescription("");
    setIsPublished(true);
    setEditingCourseId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Course title is required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const courseData = {
        title,
        description,
        is_published: isPublished,
      };

      if (editingCourseId) {
        await updateCourse(editingCourseId, courseData);
      } else {
        await createCourse(courseData);
      }

      resetForm();
      await loadCourses();
    } catch {
      setError("Failed to save course.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(course: Course) {
    setEditingCourseId(course.id);
    setTitle(course.title);
    setDescription(course.description);
    setIsPublished(course.is_published);
  }

  async function handleDelete(courseId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this course?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCourse(courseId);
      await loadCourses();
    } catch {
      setError("Failed to delete course.");
    }
  }

  return (
    <section className="page">
      <h1>Instructor Dashboard</h1>
      <p>Welcome, {user?.username}. Manage your courses here.</p>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <h2>{editingCourseId ? "Edit Course" : "Create Course"}</h2>

        <form onSubmit={handleSubmit} className="course-form">
          <label htmlFor="title">Course Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Introduction to Web Development"
            required
          />

          <label htmlFor="description">Course Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Write a short description for students."
            rows={4}
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
            />
            Published
          </label>

          <div className="actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editingCourseId
                  ? "Update Course"
                  : "Create Course"}
            </button>

            {editingCourseId && (
              <button
                type="button"
                onClick={resetForm}
                className="secondary-btn"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Your Courses</h2>

        {isLoading && <p>Loading courses...</p>}

        {!isLoading && courses.length === 0 && (
          <p>You have not created any courses yet.</p>
        )}

        <div className="course-grid">
          {courses.map((course) => (
            <article key={course.id} className="course-card">
              <div className="course-card-header">
                <h3>{course.title}</h3>
                <span
                  className={
                    course.is_published ? "badge success" : "badge warning"
                  }
                >
                  {course.is_published ? "Published" : "Draft"}
                </span>
              </div>

              <p>{course.description || "No description provided."}</p>

              <div className="course-actions">
                <Link
                  to={`/courses/${course.id}/chapters`}
                  className="small-link-button"
                >
                  Manage Chapters
                </Link>

                <button type="button" onClick={() => handleEdit(course)}>
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(course.id)}
                  className="danger-btn"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
