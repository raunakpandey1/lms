import type { Value } from "platejs";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";

import { lmsPlatePlugins } from "./editor/editorPlugins";
import type { ChapterContent } from "../types/chapter";
import { getSafeChapterContent } from "../utils/chapterContent";

interface PlateRichTextViewerProps {
  value: ChapterContent;
}

export function PlateRichTextViewer({ value }: PlateRichTextViewerProps) {
  const editor = usePlateEditor({
    plugins: lmsPlatePlugins,
    value: getSafeChapterContent(value) as Value,
  });

  return (
    <div className="plate-viewer-wrapper">
      <Plate editor={editor} readOnly>
        <PlateContent className="plate-content readonly" readOnly />
      </Plate>
    </div>
  );
}