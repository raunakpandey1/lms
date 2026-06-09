from django.urls import path

from .views import (
    CourseViewSet,
    JoinCourseView,
    MyEnrolledCoursesView,
    ChapterDetailView,
    ChapterListCreateView,
    ChapterMcqQuestionBulkCreateView,
    ChapterMcqQuestionDetailView,
    ChapterMcqQuestionListCreateView,
    ChapterMcqQuestionSubmissionListView,
    ChapterMcqQuestionSubmitView,
)

# A ViewSet contains multiple actions so we map http methods manualy
course_list = CourseViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)

course_detail = CourseViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

urlpatterns = [
    path("", course_list, name="course-list"),
    path("my-courses/", MyEnrolledCoursesView.as_view(), name="my-courses"),
    path("<int:pk>/join/", JoinCourseView.as_view(), name="course-join"),
    path(
        "<int:course_id>/chapters/",
        ChapterListCreateView.as_view(),
        name="chapter-list-create",
    ),
    path(
        "<int:course_id>/chapters/<int:chapter_id>/questions/",
        ChapterMcqQuestionListCreateView.as_view(),
        name="chapter-question-list-create",
    ),
    path(
        "<int:course_id>/chapters/<int:chapter_id>/questions/bulk/",
        ChapterMcqQuestionBulkCreateView.as_view(),
        name="chapter-question-bulk-create",
    ),
    path(
        "<int:course_id>/chapters/<int:chapter_id>/questions/<str:question_id>/",
        ChapterMcqQuestionDetailView.as_view(),
        name="chapter-question-detail",
    ),
    path(
        "<int:course_id>/chapters/<int:chapter_id>/questions/<str:question_id>/submit/",
        ChapterMcqQuestionSubmitView.as_view(),
        name="chapter-question-submit",
    ),
    path(
        "<int:course_id>/chapters/<int:chapter_id>/questions/<str:question_id>/submissions/",
        ChapterMcqQuestionSubmissionListView.as_view(),
        name="chapter-question-submissions",
    ),
    path(
        "<int:course_id>/chapters/<int:pk>/",
        ChapterDetailView.as_view(),
        name="chapter-detail",
    ),
    path("<int:pk>/", course_detail, name="course-detail"),
    
]
