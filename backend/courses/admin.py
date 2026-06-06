from django.contrib import admin

# Register your models here.
from .models import Course


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "instructor",
        "is_published",
        "created_at",
    )
    list_filter = (
        "is_published",
        "created_at",
    )
    search_fields = (
        "title",
        "description",
        "instructor__username",
    )