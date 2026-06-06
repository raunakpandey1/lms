from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import generics, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from .models import Course, Enrollment, Chapter
from .permissions import (
    IsCourseInstructorOrReadOnlyPublicChapter,
    IsInstructorOrReadOnly,
    IsStudent,
)
from .serializers import ChapterSerializer, CourseSerializer, EnrollmentSerializer


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsInstructorOrReadOnly]

    def get_queryset(self):
        queryset = Course.objects.select_related("instructor").all()

        if self.request.user.is_student:
            return queryset.filter(is_published=True)

        if self.request.user.is_instructor:
            return queryset.filter(
                Q(is_published=True) | Q(instructor=self.request.user)
            ).distinct()

        return Course.objects.none()

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


class JoinCourseView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        course = get_object_or_404(
            Course,
            pk=pk,
            is_published=True,
        )

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
            .order_by("-enrollments__joined_at")
        )
        

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