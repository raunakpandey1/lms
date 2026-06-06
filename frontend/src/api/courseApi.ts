import { apiClient } from "./axios";
import type { Course, CourseRequest, Enrollment } from "../types/course";

export async function getCourses(): Promise<Course[]> {
  const response = await apiClient.get<Course[]>("/courses/");
  return response.data;
}

export async function getMyCourses(): Promise<Course[]> {
  const response = await apiClient.get<Course[]>("/courses/my-courses/");
  return response.data;
}

export async function createCourse(data: CourseRequest): Promise<Course> {
  const response = await apiClient.post<Course>("/courses/", data);
  return response.data;
}

export async function updateCourse(
  courseId: number,
  data: Partial<CourseRequest>
): Promise<Course> {
  const response = await apiClient.patch<Course>(`/courses/${courseId}/`, data);
  return response.data;
}

export async function deleteCourse(courseId: number): Promise<void> {
  await apiClient.delete(`/courses/${courseId}/`);
}

export async function joinCourse(courseId: number): Promise<Enrollment> {
  const response = await apiClient.post<Enrollment>(
    `/courses/${courseId}/join/`
  );
  return response.data;
}