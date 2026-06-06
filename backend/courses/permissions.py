from rest_framework import permissions


class IsInstructorOrReadOnly(permissions.BasePermission):
    """
    Allows authenticated users to read courses.
    Allows only instructors to create courses.
    Allows only the course owner to update/delete their own courses.
    """
    message = "Only instructors can create courses, and only course owners can modify them."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_instructor
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        return obj.instructor == request.user
    

class IsStudent(permissions.BasePermission):
    message = "Only students can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_student
        )