import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
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

interface QuestionOptionDraft {
  id: string;
  text: string;
  is_correct: boolean;
}

const EMPTY_MARKS: InlineMarksState = {
  bold: false,
  italic: false,
  underline: false,
  code: false,
};

const OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function createEmptyBlock(type: BlockType = "p") {
  return {
    type,
    children: [{ text: "" }],
  };
}

function createQuestionOption(text = "", is_correct = false): QuestionOptionDraft {
  return {
    id: crypto.randomUUID(),
    text,
    is_correct,
  };
}

function createDefaultQuestionOptions(): QuestionOptionDraft[] {
  return [createQuestionOption(), createQuestionOption()];
}

function countMcqQuestions(nodes: unknown[]): number {
  return nodes.reduce<number>((count, node) => {
    if (typeof node !== "object" || node === null) {
      return count;
    }

    const nodeRecord = node as { type?: string; children?: unknown[] };
    const currentNodeCount = nodeRecord.type === "mcq_question" ? 1 : 0;
    const childNodeCount = Array.isArray(nodeRecord.children)
      ? countMcqQuestions(nodeRecord.children)
      : 0;

    return count + currentNodeCount + childNodeCount;
  }, 0);
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
  const [isInsertMenuOpen, setIsInsertMenuOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionOptions, setQuestionOptions] = useState<QuestionOptionDraft[]>(
    createDefaultQuestionOptions,
  );
  const [totalPoints, setTotalPoints] = useState("1");
  const [correctnessPoints, setCorrectnessPoints] = useState("0.5");
  const [participationPoints, setParticipationPoints] = useState("0.5");

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
      }),
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
      },
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

  function resetQuestionForm() {
    setQuestionText("");
    setQuestionOptions(createDefaultQuestionOptions());
    setTotalPoints("1");
    setCorrectnessPoints("0.5");
    setParticipationPoints("0.5");
  }

  function openQuestionModal() {
    setIsInsertMenuOpen(false);
    resetQuestionForm();
    setIsQuestionModalOpen(true);
  }

  function closeQuestionModal() {
    setIsQuestionModalOpen(false);
    resetQuestionForm();
  }

  function updateQuestionOption(
    optionId: string,
    field: "text" | "is_correct",
    value: string | boolean,
  ) {
    setQuestionOptions((currentOptions) =>
      currentOptions.map((option) =>
        option.id === optionId ? { ...option, [field]: value } : option,
      ),
    );
  }

  function addQuestionOption() {
    setQuestionOptions((currentOptions) => [
      ...currentOptions,
      createQuestionOption(),
    ]);
  }

  function removeQuestionOption(optionId: string) {
    setQuestionOptions((currentOptions) => {
      if (currentOptions.length <= 2) {
        return currentOptions;
      }

      return currentOptions.filter((option) => option.id !== optionId);
    });
  }

  function insertQuestion() {
    const cleanedQuestion = questionText.trim();
    const cleanedOptions = questionOptions
      .map((option) => ({
        ...option,
        text: option.text.trim(),
      }))
      .filter((option) => option.text.length > 0);

    if (!cleanedQuestion) {
      window.alert("Please write a question.");
      return;
    }

    if (cleanedOptions.length < 2) {
      window.alert("Please add at least two answer options.");
      return;
    }

    if (!cleanedOptions.some((option) => option.is_correct)) {
      window.alert("Please mark at least one option as correct.");
      return;
    }

    const parsedTotalPoints = Number(totalPoints);
    const parsedCorrectnessPoints = Number(correctnessPoints);
    const parsedParticipationPoints = Number(participationPoints);

    if (
      !Number.isFinite(parsedTotalPoints) ||
      !Number.isFinite(parsedCorrectnessPoints) ||
      !Number.isFinite(parsedParticipationPoints) ||
      parsedTotalPoints < 0 ||
      parsedCorrectnessPoints < 0 ||
      parsedParticipationPoints < 0
    ) {
      window.alert("Please enter valid grade point values.");
      return;
    }

    if (isCurrentBlock("code_block")) {
      exitCodeBlock("p");
    }

    const existingQuestionCount = countMcqQuestions(
      Array.isArray(editor.children) ? (editor.children as unknown[]) : [],
    );

    editor.tf.insertNodes({
      type: "mcq_question",
      question: cleanedQuestion,
      questionNumber: existingQuestionCount + 1,
      totalPoints: parsedTotalPoints,
      correctnessPoints: parsedCorrectnessPoints,
      participationPoints: parsedParticipationPoints,
      options: cleanedOptions.map((option) => ({
        id: option.id,
        text: option.text,
        is_correct: option.is_correct,
      })),
      children: [{ text: "" }],
    });
    editor.tf.insertNodes(createEmptyBlock("p"));
    editor.tf.focus();

    closeQuestionModal();
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
          <div className="toolbar-insert-menu">
            <button
              type="button"
              className="insert-menu-trigger"
              title="Insert content"
              aria-expanded={isInsertMenuOpen}
              onMouseDown={(event) => {
                event.preventDefault();
                setIsInsertMenuOpen((isOpen) => !isOpen);
              }}
            >
              +
            </button>

            {isInsertMenuOpen && (
              <div className="insert-menu-popover">
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    openQuestionModal();
                  }}
                >
                  Create question
                </button>
              </div>
            )}
          </div>

          <span className="toolbar-divider" />

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

      {isQuestionModalOpen && (
        <div className="question-modal-backdrop" role="presentation">
          <div
            className="question-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-modal-title"
          >
            <div className="question-modal-form">
              <div className="question-modal-header">
                <div>
                  <p className="question-modal-kicker">Create Question</p>
                  <h3 id="question-modal-title">Multiple choice question</h3>
                </div>
                <button
                  type="button"
                  className="question-modal-close"
                  onClick={closeQuestionModal}
                  aria-label="Close question modal"
                >
                  ×
                </button>
              </div>

              <label htmlFor="question-text">Question</label>
              <textarea
                id="question-text"
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                placeholder="Your question content"
                rows={5}
              />

              <div className="question-options-header">
                <span>Answer choices</span>
                <small>Select all correct answers.</small>
              </div>

              <div className="question-options-list">
                {questionOptions.map((option, index) => (
                  <div className="question-option-row" key={option.id}>
                    <span className="question-option-index">
                      {OPTION_LABELS[index] || index + 1}.
                    </span>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(event) =>
                        updateQuestionOption(
                          option.id,
                          "text",
                          event.target.value,
                        )
                      }
                      placeholder="Answer Choice"
                    />
                    <label className="question-correct-checkbox">
                      <input
                        type="checkbox"
                        checked={option.is_correct}
                        onChange={(event) =>
                          updateQuestionOption(
                            option.id,
                            "is_correct",
                            event.target.checked,
                          )
                        }
                      />
                      Correct
                    </label>
                    <button
                      type="button"
                      className="question-remove-option"
                      onClick={() => removeQuestionOption(option.id)}
                      disabled={questionOptions.length <= 2}
                      aria-label={`Remove option ${OPTION_LABELS[index] || index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="question-add-option"
                onClick={addQuestionOption}
              >
                + Add another option
              </button>

              <div className="question-grade-settings">
                <h4>Grade settings</h4>
                <div className="question-grade-grid">
                  <label>
                    <span>Total Points</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={totalPoints}
                      onChange={(event) => setTotalPoints(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Correctness</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={correctnessPoints}
                      onChange={(event) =>
                        setCorrectnessPoints(event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Participation</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={participationPoints}
                      onChange={(event) =>
                        setParticipationPoints(event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="question-modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeQuestionModal}
                >
                  Cancel
                </button>
                <button type="button" onClick={insertQuestion}>Save Question</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
