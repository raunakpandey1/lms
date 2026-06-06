import { apiClient } from "./axios";
import type { Chapter, ChapterRequest } from "../types/chapter";

export async function getChapters(courseId: number): Promise<Chapter[]> {
  const response = await apiClient.get<Chapter[]>(
    `/courses/${courseId}/chapters/`
  );

  return response.data;
}

export async function getChapter(
  courseId: number,
  chapterId: number
): Promise<Chapter> {
  const response = await apiClient.get<Chapter>(
    `/courses/${courseId}/chapters/${chapterId}/`
  );

  return response.data;
}

export async function createChapter(
  courseId: number,
  data: ChapterRequest
): Promise<Chapter> {
  const response = await apiClient.post<Chapter>(
    `/courses/${courseId}/chapters/`,
    data
  );

  return response.data;
}

export async function updateChapter(
  courseId: number,
  chapterId: number,
  data: Partial<ChapterRequest>
): Promise<Chapter> {
  const response = await apiClient.patch<Chapter>(
    `/courses/${courseId}/chapters/${chapterId}/`,
    data
  );

  return response.data;
}

export async function deleteChapter(
  courseId: number,
  chapterId: number
): Promise<void> {
  await apiClient.delete(`/courses/${courseId}/chapters/${chapterId}/`);
}