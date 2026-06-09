from rest_framework import serializers

from .models import Course, Enrollment, Chapter, ChapterQuestionSubmission
from .mcq import normalize_chapter_content


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

        try:
            return normalize_chapter_content(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))


def build_mcq_node(validated_data):
    return {
        "type": "mcq_question",
        "id": validated_data.get("id") or "",
        "question": validated_data["question"],
        "totalPoints": validated_data.get("totalPoints", 1),
        "correctnessPoints": validated_data.get("correctnessPoints", 0.5),
        "participationPoints": validated_data.get("participationPoints", 0.5),
        "options": [
            {
                "id": option.get("id") or "",
                "text": option["text"],
                "is_correct": option.get("is_correct", False),
            }
            for option in validated_data["options"]
        ],
        "children": [{"text": ""}],
    }


class McqOptionWriteSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_blank=True)
    text = serializers.CharField(trim_whitespace=True)
    is_correct = serializers.BooleanField(default=False)


class McqQuestionWriteSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_blank=True)
    question = serializers.CharField(trim_whitespace=True)
    options = McqOptionWriteSerializer(many=True)
    totalPoints = serializers.FloatField(default=1, min_value=0)
    correctnessPoints = serializers.FloatField(default=0.5, min_value=0)
    participationPoints = serializers.FloatField(default=0.5, min_value=0)

    def validate_options(self, value):
        cleaned_options = [option for option in value if option.get("text", "").strip()]

        if len(cleaned_options) < 2:
            raise serializers.ValidationError("Add at least two answer options.")

        if not any(option.get("is_correct") for option in cleaned_options):
            raise serializers.ValidationError("Mark at least one answer option as correct.")

        return cleaned_options

    def validate(self, attrs):
        correctness_points = attrs.get("correctnessPoints", 0)
        participation_points = attrs.get("participationPoints", 0)
        total_points = attrs.get("totalPoints", 0)

        if correctness_points + participation_points > total_points:
            raise serializers.ValidationError(
                "correctnessPoints plus participationPoints cannot be greater than totalPoints."
            )

        return attrs

    def to_mcq_node(self):
        return build_mcq_node(self.validated_data)


class McqQuestionBulkCreateSerializer(serializers.Serializer):
    questions = McqQuestionWriteSerializer(many=True)

    def validate_questions(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one question.")
        return value

    def to_mcq_nodes(self):
        return [build_mcq_node(question) for question in self.validated_data["questions"]]


class McqAnswerSubmitSerializer(serializers.Serializer):
    selected_option_ids = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
    )

    def validate_selected_option_ids(self, value):
        cleaned_ids = [str(option_id).strip() for option_id in value if str(option_id).strip()]

        if not cleaned_ids:
            raise serializers.ValidationError("Select at least one answer option.")

        return list(dict.fromkeys(cleaned_ids))


class ChapterQuestionSubmissionSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(
        source="student.username",
        read_only=True,
    )

    class Meta:
        model = ChapterQuestionSubmission
        fields = (
            "id",
            "student",
            "student_username",
            "chapter",
            "question_id",
            "selected_option_ids",
            "is_correct",
            "earned_points",
            "correctness_earned_points",
            "participation_earned_points",
            "submitted_at",
            "updated_at",
        )
        read_only_fields = fields
