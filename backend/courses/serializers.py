from rest_framework import serializers

from .models import Course, Enrollment


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(
        source="instructor.username",
        read_only=True,
    )

    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "description",
            "is_published",
            "instructor",
            "instructor_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "instructor",
            "instructor_name",
            "created_at",
            "updated_at",
        )
        
class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    student_username = serializers.CharField(
        source="student.username",
        read_only=True,
    )

    class Meta:
        model = Enrollment
        fields = (
            "id",
            "student_username",
            "course",
            "joined_at",
        )
        read_only_fields = (
            "id",
            "student_username",
            "course",
            "joined_at",
        )