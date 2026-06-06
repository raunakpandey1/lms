import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createChapter,
  deleteChapter,
  getChapters,
  updateChapter,
} from "../api/chapterApi";
import { PlateRichTextEditor } from "../components/PlateRichTextEditor";
import { PlateRichTextViewer } from "../components/PlateRichTextViewer";
import { useAuth } from "../context/AuthContext";
import type { Chapter, ChapterContent } from "../types/chapter";
import {
  DEFAULT_CHAPTER_CONTENT,
  getSafeChapterContent,
} from "../utils/chapterContent";

export function CourseChapters() {
  const { user } = useAuth();
  const { courseId } = useParams();

  const numericCourseId = Number(courseId);

  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ChapterContent>(
    DEFAULT_CHAPTER_CONTENT,
  );
  const [isPublic, setIsPublic] = useState(false);
  const [order, setOrder] = useState(1);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isInstructor = user?.role === "instructor";

  async function loadChapters() {
    if (!numericCourseId) {
      setError("Invalid course ID.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getChapters(numericCourseId);
      setChapters(data);
    } catch {
      setError("Failed to load chapters.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChapters();
  }, [numericCourseId]);

  function resetForm() {
    setTitle("");
    setContent(DEFAULT_CHAPTER_CONTENT);
    setIsPublic(false);
    setOrder(1);
    setEditingChapterId(null);
    setEditorKey((currentKey) => currentKey + 1);
  }

  function handleEdit(chapter: Chapter) {
    setEditingChapterId(chapter.id);
    setTitle(chapter.title);
    setContent(getSafeChapterContent(chapter.content));
    setIsPublic(chapter.is_public);
    setOrder(chapter.order);
    setEditorKey((currentKey) => currentKey + 1);
  }

  function sortChapters(chapterList: Chapter[]) {
    return [...chapterList].sort((a, b) => {
      if (a.order === b.order) {
        return a.id - b.id;
      }

      return a.order - b.order;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Chapter title is required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const chapterData = {
      title,
      content: getSafeChapterContent(content),
      is_public: isPublic,
      order,
    };

    try {
      if (editingChapterId) {
        const updatedChapter = await updateChapter(
          numericCourseId,
          editingChapterId,
          chapterData,
        );

        setChapters((currentChapters) =>
          sortChapters(
            currentChapters.map((chapter) =>
              chapter.id === updatedChapter.id ? updatedChapter : chapter,
            ),
          ),
        );
      } else {
        const createdChapter = await createChapter(
          numericCourseId,
          chapterData,
        );

        setChapters((currentChapters) =>
          sortChapters([...currentChapters, createdChapter]),
        );
      }

      resetForm();
    } catch {
      setError("Failed to save chapter.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(chapterId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this chapter?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteChapter(numericCourseId, chapterId);

      setChapters((currentChapters) =>
        currentChapters.filter((chapter) => chapter.id !== chapterId),
      );
    } catch {
      setError("Failed to delete chapter.");
    }
  }

  async function handleToggleVisibility(chapter: Chapter) {
    try {
      const updatedChapter = await updateChapter(numericCourseId, chapter.id, {
        is_public: !chapter.is_public,
      });

      setChapters((currentChapters) =>
        sortChapters(
          currentChapters.map((currentChapter) =>
            currentChapter.id === updatedChapter.id
              ? updatedChapter
              : currentChapter,
          ),
        ),
      );
    } catch {
      setError("Failed to update chapter visibility.");
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Course Chapters</h1>
          <p>
            {isInstructor
              ? "Create and manage chapters for this course."
              : "Read the public chapters available for this course."}
          </p>
        </div>

        <Link
          to={isInstructor ? "/instructor/dashboard" : "/student/dashboard"}
        >
          Back to Dashboard
        </Link>
      </div>

      {error && <p className="error">{error}</p>}

      {isInstructor && (
        <div className="card">
          <h2>{editingChapterId ? "Edit Chapter" : "Create Chapter"}</h2>

          <form onSubmit={handleSubmit} className="chapter-form">
            <label htmlFor="chapter-title">Chapter Title</label>
            <input
              id="chapter-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Getting Started"
              required
            />

            <label>Chapter Content</label>
            <PlateRichTextEditor
              key={editorKey}
              value={content}
              onChange={setContent}
            />

            <label htmlFor="chapter-order">Order</label>
            <input
              id="chapter-order"
              type="number"
              min={0}
              value={order}
              onChange={(event) => setOrder(Number(event.target.value))}
            />

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
              />
              Public chapter
            </label>

            <div className="actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingChapterId
                    ? "Update Chapter"
                    : "Create Chapter"}
              </button>

              {editingChapterId && (
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
      )}

      <div className="card">
        <h2>Chapters</h2>

        {isLoading && <p>Loading chapters...</p>}

        {!isLoading && chapters.length === 0 && (
          <p>
            {isInstructor
              ? "No chapters have been created yet."
              : "No public chapters are available yet."}
          </p>
        )}

        <div className="chapter-list">
          {chapters.map((chapter) => (
            <article key={chapter.id} className="chapter-card">
              <div className="chapter-card-header">
                <div>
                  <h3>
                    {chapter.order}. {chapter.title}
                  </h3>
                  <p className="muted">
                    {chapter.is_public ? "Public" : "Private"}
                  </p>
                </div>

                {isInstructor && (
                  <span
                    className={
                      chapter.is_public ? "badge success" : "badge warning"
                    }
                  >
                    {chapter.is_public ? "Public" : "Private"}
                  </span>
                )}
              </div>

              <PlateRichTextViewer
                key={`${chapter.id}-${chapter.updated_at}`}
                value={chapter.content}
              />

              {isInstructor && (
                <div className="course-actions">
                  <button type="button" onClick={() => handleEdit(chapter)}>
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(chapter)}
                    className="secondary-btn"
                  >
                    {chapter.is_public ? "Make Private" : "Make Public"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(chapter.id)}
                    className="danger-btn"
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
