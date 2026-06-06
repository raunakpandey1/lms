from rest_framework import permissions


class IsInstructorOrReadOnly(permissions.BasePermission):
    """
    Allows authenticated users to read courses.
    Allows only instructors to create courses.
    Allows only the course owner to update/delete their own courses.
    """
    message = "Only instructors can create courses, and only course owners can modify them."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS: # Safe mthods means read-only HTTP methods
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

# It controls who can read, update, or delete chapter content.
class IsCourseInstructorOrReadOnlyPublicChapter(permissions.BasePermission):
    """
    Object-level permission for chapter detail/update/delete.

    Instructor:
    - Can read/update/delete chapters only for their own courses.

    Student:
    - Can read only public chapters.
    - Cannot update/delete chapters.
    """

    message = "You do not have permission to access this chapter."

    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_instructor:
            return obj.course.instructor == user

        if user.is_student and request.method in permissions.SAFE_METHODS:
            return obj.is_public

        return False