from django.contrib import admin

# Register your models here.
from .models import Course, Enrollment, Chapter


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
    
@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "student",
        "course",
        "joined_at",
    )
    list_filter = (
        "joined_at",
    )
    search_fields = (
        "student__username",
        "course__title",
    )
    
    
@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "course",
        "is_public",
        "order",
        "created_at",
    )
    list_filter = (
        "is_public",
        "created_at",
    )
    search_fields = (
        "title",
        "course__title",
    )