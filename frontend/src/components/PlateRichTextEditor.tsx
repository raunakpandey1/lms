import { useState, type KeyboardEvent, type MouseEvent } from "react";
import type { Value } from "platejs";
import { PathApi } from "platejs";
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
  isActive?: boolean;
  onPress: () => void;
}

type InlineMark = "bold" | "italic" | "underline";
type BlockType = "p" | "h1" | "h2" | "h3" | "code_block";

interface InlineMarksState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  code: boolean;
}

interface ToolbarState {
  blockType: BlockType | null;
  isQuoteActive: boolean;
  marks: InlineMarksState;
}

const EMPTY_MARKS: InlineMarksState = {
  bold: false,
  italic: false,
  underline: false,
  code: false,
};

function createEmptyBlock(type: BlockType = "p") {
  return {
    type,
    children: [{ text: "" }],
  };
}

function ToolbarButton({
  label,
  title,
  isActive = false,
  onPress,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      className={isActive ? "active" : undefined}
      aria-pressed={isActive}
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

  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    blockType: "p",
    isQuoteActive: false,
    marks: EMPTY_MARKS,
  });

  function getCurrentBlockType(): BlockType | null {
    const blockEntry = editor.api.block();
    const blockNode = blockEntry?.[0];

    if (
      blockNode &&
      typeof blockNode === "object" &&
      "type" in blockNode &&
      typeof blockNode.type === "string"
    ) {
      return blockNode.type as BlockType;
    }

    return null;
  }

  function getActiveMarks(): InlineMarksState {
    const marks = editor.api.marks();

    return {
      bold: Boolean(marks?.bold),
      italic: Boolean(marks?.italic),
      underline: Boolean(marks?.underline),
      code: Boolean(marks?.code),
    };
  }

  function isInBlockquote(): boolean {
    return Boolean(
      editor.api.above({
        match: (node) =>
          typeof node === "object" &&
          node !== null &&
          "type" in node &&
          node.type === "blockquote",
      })
    );
  }

  function refreshToolbarState() {
    setToolbarState({
      blockType: getCurrentBlockType(),
      isQuoteActive: isInBlockquote(),
      marks: getActiveMarks(),
    });
  }

  function isCurrentBlock(type: BlockType): boolean {
    return getCurrentBlockType() === type;
  }

  function setCurrentBlockType(type: BlockType) {
    editor.tf.setNodes(
      { type },
      {
        match: (node) => editor.api.isBlock(node),
      }
    );

    editor.tf.focus();
    window.requestAnimationFrame(refreshToolbarState);
  }

  function exitCodeBlock(nextType: BlockType = "p") {
    const blockEntry = editor.api.block();

    if (!blockEntry) {
      return;
    }

    const [, blockPath] = blockEntry;
    const nextPath = PathApi.next(blockPath);

    editor.tf.insertNodes(createEmptyBlock(nextType), { at: nextPath });
    editor.tf.select(nextPath, { edge: "start" });
    editor.tf.focus();

    window.requestAnimationFrame(refreshToolbarState);
  }

  function applyBlockType(type: BlockType) {
    if (isCurrentBlock("code_block")) {
      exitCodeBlock(type);
      return;
    }

    setCurrentBlockType(isCurrentBlock(type) ? "p" : type);
  }

  function toggleQuote() {
    if (isCurrentBlock("code_block")) {
      exitCodeBlock("p");
    }

    editor.tf.blockquote.toggle();
    editor.tf.focus();

    window.requestAnimationFrame(refreshToolbarState);
  }

  function toggleCodeBlock() {
    if (isCurrentBlock("code_block")) {
      exitCodeBlock("p");
      return;
    }

    setCurrentBlockType("code_block");
  }

  function runInlineFormat(format: InlineMark) {
    if (isCurrentBlock("code_block")) {
      exitCodeBlock("p");
    }

    if (format === "bold") {
      editor.tf.bold.toggle();
    }

    if (format === "italic") {
      editor.tf.italic.toggle();
    }

    if (format === "underline") {
      editor.tf.underline.toggle();
    }


    editor.tf.focus();
    window.requestAnimationFrame(refreshToolbarState);
  }

  function insertLink() {
    if (isCurrentBlock("code_block")) {
      exitCodeBlock("p");
    }

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

    window.requestAnimationFrame(refreshToolbarState);
  }

  function insertImage() {
    if (isCurrentBlock("code_block")) {
      exitCodeBlock("p");
    }

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

    window.requestAnimationFrame(refreshToolbarState);
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isCurrentBlock("code_block")) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      editor.tf.insertText("\n");
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      editor.tf.insertText("  ");
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      exitCodeBlock("p");
    }
  }

  function handleEditableAreaMouseDown(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    if (target.closest('[contenteditable="true"]')) {
      return;
    }

    window.requestAnimationFrame(() => {
      editor.tf.focus({ edge: "endEditor" });
      refreshToolbarState();
    });
  }

  return (
    <div className="plate-editor-wrapper">
      <Plate
        editor={editor}
        onChange={({ value }) => {
          onChange(value as ChapterContent);
          window.requestAnimationFrame(refreshToolbarState);
        }}
      >
        <div className="plate-toolbar">
          <ToolbarButton
            label="B"
            title="Bold"
            isActive={toolbarState.marks.bold}
            onPress={() => runInlineFormat("bold")}
          />

          <ToolbarButton
            label="I"
            title="Italic"
            isActive={toolbarState.marks.italic}
            onPress={() => runInlineFormat("italic")}
          />

          <ToolbarButton
            label="U"
            title="Underline"
            isActive={toolbarState.marks.underline}
            onPress={() => runInlineFormat("underline")}
          />

        
          <span className="toolbar-divider" />

          <ToolbarButton
            label="H1"
            title="Heading 1"
            isActive={toolbarState.blockType === "h1"}
            onPress={() => applyBlockType("h1")}
          />

          <ToolbarButton
            label="H2"
            title="Heading 2"
            isActive={toolbarState.blockType === "h2"}
            onPress={() => applyBlockType("h2")}
          />

          <ToolbarButton
            label="H3"
            title="Heading 3"
            isActive={toolbarState.blockType === "h3"}
            onPress={() => applyBlockType("h3")}
          />

          <ToolbarButton
            label="Quote"
            title="Blockquote"
            isActive={toolbarState.isQuoteActive}
            onPress={toggleQuote}
          />

          <span className="toolbar-divider" />

          <ToolbarButton
            label="Code Block"
            title="Code block"
            isActive={toolbarState.blockType === "code_block"}
            onPress={toggleCodeBlock}
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

        <div
          className="plate-editable-area"
          onMouseDown={handleEditableAreaMouseDown}
        >
          <PlateContent
            aria-label="Chapter content editor"
            autoFocusOnEditable
            className="plate-content"
            onClick={refreshToolbarState}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={refreshToolbarState}
            onMouseUp={refreshToolbarState}
            placeholder="Write chapter content here..."
            readOnly={false}
            spellCheck
          />
        </div>
      </Plate>
    </div>
  );
}