from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Course
from .permissions import IsInstructorOrReadOnly
from .serializers import CourseSerializer


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsInstructorOrReadOnly]

    def get_queryset(self):
        return Course.objects.select_related("instructor").all()

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)