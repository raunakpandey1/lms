import type { Value } from "platejs";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";

import { lmsPlatePlugins } from "./editor/editorPlugins";
import type { ChapterContent } from "../types/chapter";
import { getSafeChapterContent } from "../utils/chapterContent";

interface PlateRichTextEditorProps {
  value: ChapterContent;
  onChange: (value: ChapterContent) => void;
}

interface ToolbarButtonProps {
  label: string;
  title: string;
  onPress: () => void;
}

function ToolbarButton({ label, title, onPress }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => {
        event.preventDefault();
        onPress();
      }}
    >
      {label}
    </button>
  );
}

function normalizeUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

export function PlateRichTextEditor({
  value,
  onChange,
}: PlateRichTextEditorProps) {
  const editor = usePlateEditor({
    plugins: lmsPlatePlugins,
    value: getSafeChapterContent(value) as Value,
  });

  function insertLink() {
    const rawUrl = window.prompt("Enter link URL:");

    if (!rawUrl) {
      return;
    }

    const safeUrl = normalizeUrl(rawUrl);

    if (!safeUrl) {
      window.alert("Please enter a valid http or https URL.");
      return;
    }

    const linkText = window.prompt("Enter link text:") || safeUrl;

    editor.tf.insertNodes({
      type: "link",
      url: safeUrl,
      children: [{ text: linkText }],
    });
  }

  function insertImage() {
    const rawUrl = window.prompt("Enter image URL:");

    if (!rawUrl) {
      return;
    }

    const safeUrl = normalizeUrl(rawUrl);

    if (!safeUrl) {
      window.alert("Please enter a valid http or https image URL.");
      return;
    }

    const alt = window.prompt("Enter image alt text:") || "Chapter image";

    editor.tf.insertNodes({
      type: "image",
      url: safeUrl,
      alt,
      children: [{ text: "" }],
    });
  }

  function insertCodeBlock() {
    editor.tf.insertNodes({
      type: "code_block",
      children: [{ text: "// Write code here" }],
    });
  }

  return (
    <div className="plate-editor-wrapper">
      <Plate
        editor={editor}
        onChange={({ value }) => {
          onChange(value as ChapterContent);
        }}
      >
        <div className="plate-toolbar">
          <ToolbarButton
            label="B"
            title="Bold"
            onPress={() => editor.tf.bold.toggle()}
          />

          <ToolbarButton
            label="I"
            title="Italic"
            onPress={() => editor.tf.italic.toggle()}
          />

          <ToolbarButton
            label="U"
            title="Underline"
            onPress={() => editor.tf.underline.toggle()}
          />

          <ToolbarButton
            label="Code"
            title="Inline code"
            onPress={() => editor.tf.code.toggle()}
          />

          <span className="toolbar-divider" />

          <ToolbarButton
            label="H1"
            title="Heading 1"
            onPress={() => editor.tf.h1.toggle()}
          />

          <ToolbarButton
            label="H2"
            title="Heading 2"
            onPress={() => editor.tf.h2.toggle()}
          />

          <ToolbarButton
            label="H3"
            title="Heading 3"
            onPress={() => editor.tf.h3.toggle()}
          />

          <ToolbarButton
            label="Quote"
            title="Blockquote"
            onPress={() => editor.tf.blockquote.toggle()}
          />

          <span className="toolbar-divider" />

          <ToolbarButton
            label="Code Block"
            title="Insert code block"
            onPress={insertCodeBlock}
          />

          <ToolbarButton
            label="Link"
            title="Insert link"
            onPress={insertLink}
          />

          <ToolbarButton
            label="Image"
            title="Insert image by URL"
            onPress={insertImage}
          />
        </div>

        <PlateContent
          className="plate-content"
          placeholder="Write chapter content here..."
        />
      </Plate>
    </div>
  );
}