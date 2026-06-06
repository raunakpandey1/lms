from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import generics, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, Enrollment
from .permissions import IsInstructorOrReadOnly, IsStudent
from .serializers import CourseSerializer, EnrollmentSerializer


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