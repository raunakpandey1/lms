import type { ChapterContent } from "../types/chapter";

export const DEFAULT_CHAPTER_CONTENT: ChapterContent = [
  {
    type: "p",
    children: [{ text: "" }],
  },
];

export function getSafeChapterContent(
  content?: ChapterContent | null
): ChapterContent {
  if (!Array.isArray(content) || content.length === 0) {
    return DEFAULT_CHAPTER_CONTENT;
  }

  return content;
}