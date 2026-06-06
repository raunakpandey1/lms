from django.urls import path

from .views import (
    CourseViewSet,
    JoinCourseView,
    MyEnrolledCoursesView,
    ChapterDetailView,
    ChapterListCreateView
)

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
        "<int:course_id>/chapters/<int:pk>/",
        ChapterDetailView.as_view(),
        name="chapter-detail",
    ),
    path("<int:pk>/", course_detail, name="course-detail"),
    
]