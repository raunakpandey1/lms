import type { Value } from "platejs";

export type ChapterContent = Value;

export interface Chapter {
  id: number;
  course: number;
  course_title: string;
  title: string;
  content: ChapterContent;
  is_public: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface ChapterRequest {
  title: string;
  content: ChapterContent;
  is_public: boolean;
  order: number;
}