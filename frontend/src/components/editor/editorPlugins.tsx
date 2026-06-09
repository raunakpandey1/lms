/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from "react";
import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";

import {
  createPlatePlugin,
  ParagraphPlugin,
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
} from "platejs/react";

interface McqOptionNode {
  id?: string;
  text?: string;
  is_correct?: boolean;
}

interface McqQuestionNode {
  question?: string;
  options?: McqOptionNode[];
  questionNumber?: number;
  totalPoints?: number;
  correctnessPoints?: number;
  participationPoints?: number;
}

const OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function ParagraphElement(props: PlateElementProps) {
  return <PlateElement as="p" className="plate-paragraph" {...props} />;
}

function H1Element(props: PlateElementProps) {
  return <PlateElement as="h1" className="plate-heading h1" {...props} />;
}

function H2Element(props: PlateElementProps) {
  return <PlateElement as="h2" className="plate-heading h2" {...props} />;
}

function H3Element(props: PlateElementProps) {
  return <PlateElement as="h3" className="plate-heading h3" {...props} />;
}

function BlockquoteElement(props: PlateElementProps) {
  return <PlateElement as="blockquote" className="plate-blockquote" {...props} />;
}

function CodeLeaf(props: PlateLeafProps) {
  return <PlateLeaf as="code" className="plate-inline-code" {...props} />;
}

function CodeBlockElement(props: PlateElementProps) {
  return (
    <PlateElement as="pre" className="plate-code-block" {...props}>
      <code>{props.children}</code>
    </PlateElement>
  );
}

function LinkElement({
  children,
  element,
  ...props
}: PlateElementProps & {
  element: {
    url?: string;
  };
}) {
  const href = element.url || "#";

  return (
    <PlateElement
      element={element}
      as="span"
      className="plate-link-wrapper"
      {...props}
    >
      <a href={href} target="_blank" rel="noreferrer" className="plate-link">
        {children}
      </a>
    </PlateElement>
  );
}
function ImageElement({
  children,
  element,
  ...props
}: PlateElementProps & {
  element: {
    url?: string;
    alt?: string;
  };
}) {
  return (
    <PlateElement
      element={element}
      as="div"
      className="plate-image-node"
      {...props}
    >
      <div contentEditable={false}>
        {element.url ? (
          <img src={element.url} alt={element.alt || "Chapter image"} />
        ) : (
          <p className="muted">Image URL missing.</p>
        )}
      </div>

      {children}
    </PlateElement>
  );
}

function McqQuestionElement({
  children,
  element,
  ...props
}: PlateElementProps & {
  element: McqQuestionNode;
}) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const options = Array.isArray(element.options) ? element.options : [];
  const correctOptions = useMemo(
    () => options.filter((option) => option.is_correct),
    [options],
  );
  const allowsMultipleAnswers = correctOptions.length > 1;
  const questionNumber = Number.isFinite(element.questionNumber)
    ? element.questionNumber
    : 1;
  const totalPoints = element.totalPoints ?? 1;
  const correctnessPoints = element.correctnessPoints ?? 0.5;
  const participationPoints = element.participationPoints ?? 0.5;

  function getOptionId(option: McqOptionNode, index: number) {
    return option.id || `${option.text || "option"}-${index}`;
  }

  function toggleStudentAnswer(optionId: string) {
    setSelectedOptionIds((currentSelectedOptionIds) => {
      if (!allowsMultipleAnswers) {
        return currentSelectedOptionIds.includes(optionId) ? [] : [optionId];
      }

      return currentSelectedOptionIds.includes(optionId)
        ? currentSelectedOptionIds.filter((id) => id !== optionId)
        : [...currentSelectedOptionIds, optionId];
    });
  }

  return (
    <PlateElement
      element={element}
      as="div"
      className="plate-mcq-node"
      {...props}
    >
      <div contentEditable={false}>
        <div className="plate-mcq-card">
          <div className="plate-mcq-edit-indicator" aria-hidden="true">
            ✎
          </div>

          <section className="plate-mcq-section plate-mcq-question-section">
            <div className="plate-mcq-section-icon">?</div>
            <div className="plate-mcq-section-body">
              <h4>Question {questionNumber}</h4>
              <p className="plate-mcq-question-text">
                {element.question || "Untitled question"}
              </p>
            </div>
          </section>

          <section className="plate-mcq-section plate-mcq-student-section">
            <div className="plate-mcq-section-icon">S</div>
            <div className="plate-mcq-section-body">
              <h4>Student Answer</h4>
              <p className="plate-mcq-help-text">
                {allowsMultipleAnswers
                  ? "Please select all correct choices"
                  : "Please select the correct choice"}
              </p>

              <div className="plate-mcq-options" role="group" aria-label="Answer choices">
                {options.length > 0 ? (
                  options.map((option, index) => {
                    const optionId = getOptionId(option, index);
                    const isSelected = selectedOptionIds.includes(optionId);
                    const isCorrect = Boolean(option.is_correct);
                    const shouldRevealCorrectness = showAnswer;

                    return (
                      <button
                        type="button"
                        className={`plate-mcq-option${isSelected ? " selected" : ""}${
                          shouldRevealCorrectness && isCorrect ? " correct" : ""
                        }${
                          shouldRevealCorrectness && isSelected && !isCorrect
                            ? " incorrect"
                            : ""
                        }`}
                        key={optionId}
                        aria-pressed={isSelected}
                        onClick={() => toggleStudentAnswer(optionId)}
                      >
                        <span className="plate-mcq-option-label">
                          {OPTION_LABELS[index] || index + 1}.
                        </span>
                        <span className="plate-mcq-option-text">
                          {option.text || "Untitled option"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="muted">No answer options added.</p>
                )}
              </div>
            </div>
          </section>

          {showAnswer && (
            <section className="plate-mcq-section plate-mcq-answer-section">
              <div className="plate-mcq-section-icon answer-icon">A</div>
              <div className="plate-mcq-section-body">
                <h4>Answer</h4>
                <div className="plate-mcq-answer-list">
                  {correctOptions.length > 0 ? (
                    correctOptions.map((option, index) => {
                      const originalIndex = options.findIndex(
                        (candidate) => candidate === option,
                      );
                      const labelIndex = originalIndex >= 0 ? originalIndex : index;

                      return (
                        <div
                          className="plate-mcq-answer-item"
                          key={getOptionId(option, labelIndex)}
                        >
                          <span>{OPTION_LABELS[labelIndex] || labelIndex + 1}.</span>
                          <strong>{option.text || "Untitled option"}</strong>
                        </div>
                      );
                    })
                  ) : (
                    <p className="muted">No correct answer selected.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="plate-mcq-footer">
            <div className="plate-mcq-grade-summary">
              <div>
                <span>Total Points</span>
                <strong>{totalPoints}</strong>
              </div>
              <div>
                <span>Correctness</span>
                <strong>{correctnessPoints}</strong>
              </div>
              <div>
                <span>Participation</span>
                <strong>{participationPoints}</strong>
              </div>
            </div>

            <label className="plate-mcq-toggle">
              <input
                type="checkbox"
                checked={showAnswer}
                onChange={(event) => setShowAnswer(event.target.checked)}
              />
              <span className="plate-mcq-toggle-track" aria-hidden="true">
                <span className="plate-mcq-toggle-thumb" />
              </span>
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </label>
          </div>
        </div>
      </div>

      {children}
    </PlateElement>
  );
}

export const LinkPlugin = createPlatePlugin({
  key: "link",
  node: {
    isElement: true,
    isInline: true,
    type: "link",
  },
}).withComponent(LinkElement);

export const ImagePlugin = createPlatePlugin({
  key: "image",
  node: {
    isElement: true,
    isVoid: true,
    type: "image",
  },
}).withComponent(ImageElement);

export const SimpleCodeBlockPlugin = createPlatePlugin({
  key: "code_block",
  node: {
    isElement: true,
    type: "code_block",
  },
}).withComponent(CodeBlockElement);

export const McqQuestionPlugin = createPlatePlugin({
  key: "mcq_question",
  node: {
    isElement: true,
    isVoid: true,
    type: "mcq_question",
  },
}).withComponent(McqQuestionElement);

export const lmsPlatePlugins = [
  ParagraphPlugin.withComponent(ParagraphElement),
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  CodePlugin.withComponent(CodeLeaf),
  H1Plugin.withComponent(H1Element),
  H2Plugin.withComponent(H2Element),
  H3Plugin.withComponent(H3Element),
  BlockquotePlugin.withComponent(BlockquoteElement),
  SimpleCodeBlockPlugin,
  LinkPlugin,
  ImagePlugin,
  McqQuestionPlugin,
];
