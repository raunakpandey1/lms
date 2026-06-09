from django.db.models import Q # Q is used for complex database filtering with OR conditions.
from django.shortcuts import get_object_or_404

from rest_framework import generics, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError

from .models import Course, Enrollment, Chapter, ChapterQuestionSubmission
from .mcq import (
    append_mcq_question,
    append_mcq_questions,
    calculate_mcq_score,
    delete_mcq_question,
    extract_mcq_questions,
    find_mcq_question,
    normalize_chapter_content,
    replace_mcq_question,
)
from .permissions import (
    IsCourseInstructorOrReadOnlyPublicChapter,
    IsInstructorOrReadOnly,
    IsStudent,
)
from .serializers import (
    ChapterQuestionSubmissionSerializer,
    ChapterSerializer,
    CourseSerializer,
    EnrollmentSerializer,
    McqAnswerSubmitSerializer,
    McqQuestionBulkCreateSerializer,
    McqQuestionWriteSerializer,
)

# modelviewset handles CRUD API
class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsInstructorOrReadOnly]

    def get_queryset(self):
        queryset = Course.objects.select_related("instructor").all() # select_related("instructor") is an optimization. it helps avoid extra database queries when serializer needs:

        if self.request.user.is_student:
            return queryset.filter(is_published=True)

        if self.request.user.is_instructor:
            return queryset.filter(
                Q(is_published=True) | Q(instructor=self.request.user)
            ).distinct()

        return Course.objects.none()

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user) # backend automatically sets currently logged-in user when course is created

# APIView - You want full control and writing custom logic
class JoinCourseView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk): # This method runs when a POST request is sent.
        course = get_object_or_404(
            Course,
            pk=pk,
            is_published=True,
        )

        #creates a new enrollment if it does not exist
        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user,
            course=course,
        )

        if not created:
            return Response(
                {"detail": "You are already enrolled in this course."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = EnrollmentSerializer(enrollment)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )
        
        
# this function returns courses joined by the logged-in student.
# ListAPIView used as we only want to return a list of objects.
class MyEnrolledCoursesView(generics.ListAPIView):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return (
            Course.objects.select_related("instructor")
            .filter(
                enrollments__student=self.request.user,
                is_published=True,
            )
            .order_by("-enrollments__joined_at") # most recently joined courses first.
        )
        
# it can list and create chapters
class ChapterListCreateView(generics.ListCreateAPIView):
    serializer_class = ChapterSerializer
    permission_classes = [IsAuthenticated]

    def get_course(self):
        return get_object_or_404(
            Course.objects.select_related("instructor"),
            pk=self.kwargs["course_id"],
        )

    def get_queryset(self):
        course = self.get_course()
        user = self.request.user

        queryset = Chapter.objects.select_related(
            "course",
            "course__instructor",
        ).filter(course=course)

        if user.is_instructor:
            if course.instructor == user:
                return queryset

            return queryset.filter(is_public=True, course__is_published=True)

        if user.is_student:
            is_enrolled = Enrollment.objects.filter(
                student=user,
                course=course,
            ).exists()

            if not is_enrolled:
                return Chapter.objects.none()

            return queryset.filter(
                is_public=True,
                course__is_published=True,
            )

        return Chapter.objects.none()

    def perform_create(self, serializer):
        course = self.get_course()

        if not self.request.user.is_instructor:
            raise PermissionDenied("Only instructors can create chapters.")

        if course.instructor != self.request.user:
            raise PermissionDenied(
                "You can only create chapters for your own courses."
            )

        serializer.save(course=course)

# RetrieveUpdateDestroyAPIView - generic DRf view for one object
class ChapterDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChapterSerializer
    permission_classes = [
        IsAuthenticated,
        IsCourseInstructorOrReadOnlyPublicChapter,
    ]

    def get_queryset(self):
        course_id = self.kwargs["course_id"]
        user = self.request.user

        queryset = Chapter.objects.select_related(
            "course",
            "course__instructor",
        ).filter(course_id=course_id)

        if user.is_instructor:
            if self.request.method in ["PUT", "PATCH", "DELETE"]:
                return queryset.filter(course__instructor=user)

            return queryset.filter(
                Q(course__instructor=user)
                | Q(is_public=True, course__is_published=True)
            )

        if user.is_student:
            enrolled_course_ids = Enrollment.objects.filter(
                student=user,
            ).values_list("course_id", flat=True)

            return queryset.filter(
                course_id__in=enrolled_course_ids,
                is_public=True,
                course__is_published=True,
            )

        return Chapter.objects.none()


def get_chapter_for_question_api(course_id, chapter_id):
    chapter = get_object_or_404(
        Chapter.objects.select_related("course", "course__instructor"),
        id=chapter_id,
        course_id=course_id,
    )

    # Older MCQ nodes may not have stable ids because the first frontend version
    # stored them only inside Chapter.content. Normalize once so submissions can
    # safely reference the same question id later.
    try:
        normalized_content = normalize_chapter_content(chapter.content)
    except ValueError as exc:
        raise ValidationError({"content": str(exc)})

    if normalized_content != chapter.content:
        chapter.content = normalized_content
        chapter.save(update_fields=["content", "updated_at"])

    return chapter


def user_can_read_chapter(user, chapter):
    if not user or not user.is_authenticated:
        return False

    if user.is_instructor:
        return chapter.course.instructor == user or (
            chapter.is_public and chapter.course.is_published
        )

    if user.is_student:
        return (
            chapter.is_public
            and chapter.course.is_published
            and Enrollment.objects.filter(student=user, course=chapter.course).exists()
        )

    return False


def user_can_manage_chapter(user, chapter):
    return (
        user
        and user.is_authenticated
        and user.is_instructor
        and chapter.course.instructor == user
    )


def serialize_question(question, include_correct_answers=False, submission=None):
    serialized_options = []

    for option in question.get("options", []):
        serialized_option = {
            "id": option.get("id"),
            "text": option.get("text"),
        }

        if include_correct_answers:
            serialized_option["is_correct"] = bool(option.get("is_correct"))

        serialized_options.append(serialized_option)

    data = {
        "id": question.get("id"),
        "type": question.get("type", "mcq_question"),
        "question": question.get("question", ""),
        "questionNumber": question.get("questionNumber", 1),
        "totalPoints": question.get("totalPoints", 1),
        "correctnessPoints": question.get("correctnessPoints", 0.5),
        "participationPoints": question.get("participationPoints", 0.5),
        "options": serialized_options,
    }

    if submission is not None:
        data["submission"] = ChapterQuestionSubmissionSerializer(submission).data

    return data


def create_multiple_mcq_questions(chapter, request_data):
    if isinstance(request_data, list):
        serializer_data = {"questions": request_data}
    else:
        serializer_data = request_data

    serializer = McqQuestionBulkCreateSerializer(data=serializer_data)
    serializer.is_valid(raise_exception=True)

    existing_question_count = len(
        extract_mcq_questions(chapter.content, include_correct_answers=True)
    )

    chapter.content = append_mcq_questions(chapter.content, serializer.to_mcq_nodes())
    chapter.save(update_fields=["content", "updated_at"])

    created_questions = extract_mcq_questions(
        chapter.content,
        include_correct_answers=True,
    )[existing_question_count:]

    return [
        serialize_question(question, include_correct_answers=True)
        for question in created_questions
    ]


class ChapterMcqQuestionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id, chapter_id):
        chapter = get_chapter_for_question_api(course_id, chapter_id)

        if not user_can_read_chapter(request.user, chapter):
            raise PermissionDenied("You do not have permission to read this chapter.")

        include_correct_answers = (
            user_can_manage_chapter(request.user, chapter)
            or request.query_params.get("include_answers") == "true"
        )
        submissions_by_question_id = {}

        if request.user.is_student:
            submissions_by_question_id = {
                submission.question_id: submission
                for submission in ChapterQuestionSubmission.objects.filter(
                    chapter=chapter,
                    student=request.user,
                )
            }

        questions = [
            serialize_question(
                question,
                include_correct_answers=include_correct_answers,
                submission=submissions_by_question_id.get(question.get("id")),
            )
            for question in extract_mcq_questions(
                chapter.content,
                include_correct_answers=True,
            )
        ]

        return Response(questions)

    def post(self, request, course_id, chapter_id):
        chapter = get_chapter_for_question_api(course_id, chapter_id)

        if not user_can_manage_chapter(request.user, chapter):
            raise PermissionDenied("Only the course instructor can create questions.")

        if isinstance(request.data, list) or "questions" in request.data:
            created_questions = create_multiple_mcq_questions(chapter, request.data)
            return Response(created_questions, status=status.HTTP_201_CREATED)

        serializer = McqQuestionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        chapter.content = append_mcq_question(chapter.content, serializer.to_mcq_node())
        chapter.save(update_fields=["content", "updated_at"])

        created_question = extract_mcq_questions(
            chapter.content,
            include_correct_answers=True,
        )[-1]

        return Response(
            serialize_question(created_question, include_correct_answers=True),
            status=status.HTTP_201_CREATED,
        )


class ChapterMcqQuestionBulkCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id, chapter_id):
        chapter = get_chapter_for_question_api(course_id, chapter_id)

        if not user_can_manage_chapter(request.user, chapter):
            raise PermissionDenied("Only the course instructor can create questions.")

        created_questions = create_multiple_mcq_questions(chapter, request.data)
        return Response(created_questions, status=status.HTTP_201_CREATED)


class ChapterMcqQuestionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id, chapter_id, question_id):
        chapter = get_chapter_for_question_api(course_id, chapter_id)

        if not user_can_read_chapter(request.user, chapter):
            raise PermissionDenied("You do not have permission to read this chapter.")

        question = find_mcq_question(chapter.content, question_id)
        if question is None:
            raise NotFound("Question not found.")

        include_correct_answers = (
            user_can_manage_chapter(request.user, chapter)
            or request.query_params.get("include_answers") == "true"
        )
        submission = None

        if request.user.is_student:
            submission = ChapterQuestionSubmission.objects.filter(
                chapter=chapter,
                student=request.user,
                question_id=question_id,
            ).first()

        return Response(
            serialize_question(
                question,
                include_correct_answers=include_correct_answers,
                submission=submission,
            )
        )

    def patch(self, request, course_id, chapter_id, question_id):
        chapter = get_chapter_for_question_api(course_id, chapter_id)

        if not user_can_manage_chapter(request.user, chapter):
            raise PermissionDenied("Only the course instructor can update questions.")

        existing_question = find_mcq_question(chapter.content, question_id)
        if existing_question is None:
            raise NotFound("Question not found.")

        merged_data = {
            "question": existing_question.get("question", ""),
            "options": existing_question.get("options", []),
            "totalPoints": existing_question.get("totalPoints", 1),
            "correctnessPoints": existing_question.get("correctnessPoints", 0.5),
            "participationPoints": existing_question.get("participationPoints", 0.5),
        }
        merged_data.update(request.data)
        merged_data["id"] = question_id

        serializer = McqQuestionWriteSerializer(data=merged_data)
        serializer.is_valid(raise_exception=True)

        chapter.content, found = replace_mcq_question(
            chapter.content,
            question_id,
            serializer.to_mcq_node(),
        )

        if not found:
            raise NotFound("Question not found.")

        chapter.save(update_fields=["content", "updated_at"])
        updated_question = find_mcq_question(chapter.content, question_id)

        return Response(
            serialize_question(updated_question, include_correct_answers=True)
        )

    def delete(self, request, course_id, chapter_id, question_id):
        chapter = get_chapter_for_question_api(course_id, chapter_id)

        if not user_can_manage_chapter(request.user, chapter):
            raise PermissionDenied("Only the course instructor can delete questions.")

        chapter.content, found = delete_mcq_question(chapter.content, question_id)

        if not found:
            raise NotFound("Question not found.")

        chapter.save(update_fields=["content", "updated_at"])
        ChapterQuestionSubmission.objects.filter(
            chapter=chapter,
            question_id=question_id,
        ).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class ChapterMcqQuestionSubmitView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request, course_id, chapter_id, question_id):
        chapter = get_chapter_for_question_api(course_id, chapter_id)

        if not user_can_read_chapter(request.user, chapter):
            raise PermissionDenied("You do not have permission to answer this question.")

        submission = ChapterQuestionSubmission.objects.filter(
            chapter=chapter,
            student=request.user,
            question_id=question_id,
        ).first()

        if submission is None:
            raise NotFound("Submission not found.")

        return Response(ChapterQuestionSubmissionSerializer(submission).data)

    def post(self, request, course_id, chapter_id, question_id):
        chapter = get_chapter_for_question_api(course_id, chapter_id)

        if not user_can_read_chapter(request.user, chapter):
            raise PermissionDenied("You do not have permission to answer this question.")

        question = find_mcq_question(chapter.content, question_id)
        if question is None:
            raise NotFound("Question not found.")

        serializer = McqAnswerSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            score = calculate_mcq_score(
                question,
                serializer.validated_data["selected_option_ids"],
            )
        except ValueError as exc:
            return Response(
                {"selected_option_ids": [str(exc)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submission, _ = ChapterQuestionSubmission.objects.update_or_create(
            chapter=chapter,
            student=request.user,
            question_id=question_id,
            defaults={
                "selected_option_ids": score["selected_option_ids"],
                "is_correct": score["is_correct"],
                "earned_points": score["earned_points"],
                "correctness_earned_points": score["correctness_earned_points"],
                "participation_earned_points": score["participation_earned_points"],
            },
        )

        response_data = ChapterQuestionSubmissionSerializer(submission).data
        response_data["correct_option_ids"] = score["correct_option_ids"]
        response_data["total_points"] = score["total_points"]

        return Response(response_data, status=status.HTTP_200_OK)


class ChapterMcqQuestionSubmissionListView(generics.ListAPIView):
    serializer_class = ChapterQuestionSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        chapter = get_chapter_for_question_api(
            self.kwargs["course_id"],
            self.kwargs["chapter_id"],
        )
        question_id = self.kwargs["question_id"]

        if find_mcq_question(chapter.content, question_id) is None:
            raise NotFound("Question not found.")

        queryset = ChapterQuestionSubmission.objects.select_related(
            "student",
            "chapter",
        ).filter(
            chapter=chapter,
            question_id=question_id,
        )

        if user_can_manage_chapter(self.request.user, chapter):
            return queryset

        if self.request.user.is_student and user_can_read_chapter(self.request.user, chapter):
            return queryset.filter(student=self.request.user)

        raise PermissionDenied("You do not have permission to view submissions.")
