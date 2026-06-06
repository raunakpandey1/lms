from rest_framework import serializers

from .models import Course, Enrollment, Chapter


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(
        source="instructor.username", # Go to the course’s instructor object, then get its username.
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
        read_only_fields = ( # can't be changed by frontend 
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
        
class ChapterSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(
        source="course.title",
        read_only=True,
    )

    class Meta:
        model = Chapter
        fields = (
            "id",
            "course",
            "course_title",
            "title",
            "content",
            "is_public",
            "order",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "course",
            "course_title",
            "created_at",
            "updated_at",
        )

    def validate_content(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Chapter content must be a list of Plate.js JSON nodes."
            )

        return value