from django.urls import path

from .views import (
    CourseViewSet,
    JoinCourseView,
    MyEnrolledCoursesView,
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
    path("<int:pk>/", course_detail, name="course-detail"),
    path("<int:pk>/join/", JoinCourseView.as_view(), name="course-join"),
]