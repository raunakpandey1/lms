import copy
import math
import uuid
from typing import Any


MCQ_NODE_TYPE = "mcq_question"


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def _to_non_negative_number(value: Any, default: float, field_name: str) -> float:
    if value in (None, ""):
        return default

    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a number.") from exc

    if not math.isfinite(number) or number < 0:
        raise ValueError(f"{field_name} must be a non-negative number.")

    return number


def is_mcq_node(node: Any) -> bool:
    return isinstance(node, dict) and node.get("type") == MCQ_NODE_TYPE


def normalize_mcq_node(node: dict[str, Any], question_number: int | None = None) -> dict[str, Any]:
    normalized = copy.deepcopy(node)

    normalized["type"] = MCQ_NODE_TYPE
    normalized["id"] = str(normalized.get("id") or _new_id("question"))

    question = str(normalized.get("question") or "").strip()
    if not question:
        raise ValueError("MCQ question text is required.")
    normalized["question"] = question

    raw_options = normalized.get("options")
    if not isinstance(raw_options, list):
        raise ValueError("MCQ options must be a list.")

    options: list[dict[str, Any]] = []
    for index, raw_option in enumerate(raw_options):
        if not isinstance(raw_option, dict):
            raise ValueError("Each MCQ option must be an object.")

        option_text = str(raw_option.get("text") or "").strip()
        if not option_text:
            raise ValueError("Each MCQ option must have text.")

        options.append(
            {
                "id": str(raw_option.get("id") or _new_id("option")),
                "text": option_text,
                "is_correct": bool(raw_option.get("is_correct", False)),
            }
        )

    if len(options) < 2:
        raise ValueError("MCQ questions must have at least two options.")

    if not any(option["is_correct"] for option in options):
        raise ValueError("MCQ questions must have at least one correct option.")

    total_points = _to_non_negative_number(normalized.get("totalPoints"), 1, "totalPoints")
    correctness_points = _to_non_negative_number(
        normalized.get("correctnessPoints"),
        0.5,
        "correctnessPoints",
    )
    participation_points = _to_non_negative_number(
        normalized.get("participationPoints"),
        0.5,
        "participationPoints",
    )

    if correctness_points + participation_points > total_points + 0.000001:
        raise ValueError(
            "correctnessPoints plus participationPoints cannot be greater than totalPoints."
        )

    normalized["options"] = options
    normalized["totalPoints"] = total_points
    normalized["correctnessPoints"] = correctness_points
    normalized["participationPoints"] = participation_points
    normalized["children"] = [{"text": ""}]

    if question_number is not None:
        normalized["questionNumber"] = question_number
    else:
        normalized["questionNumber"] = int(normalized.get("questionNumber") or 1)

    return normalized


def normalize_chapter_content(content: list[Any]) -> list[Any]:
    normalized_content = copy.deepcopy(content)
    question_count = 0

    def normalize_nodes(nodes: list[Any]) -> list[Any]:
        nonlocal question_count
        normalized_nodes: list[Any] = []

        for node in nodes:
            if is_mcq_node(node):
                question_count += 1
                normalized_nodes.append(normalize_mcq_node(node, question_count))
                continue

            if isinstance(node, dict):
                normalized_node = copy.deepcopy(node)
                children = normalized_node.get("children")
                if isinstance(children, list):
                    normalized_node["children"] = normalize_nodes(children)
                normalized_nodes.append(normalized_node)
                continue

            normalized_nodes.append(node)

        return normalized_nodes

    return normalize_nodes(normalized_content)


def extract_mcq_questions(content: list[Any], include_correct_answers: bool = True) -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []

    def walk(nodes: list[Any]) -> None:
        for node in nodes:
            if is_mcq_node(node):
                normalized = normalize_mcq_node(node, len(questions) + 1)
                if not include_correct_answers:
                    normalized["options"] = [
                        {
                            "id": option["id"],
                            "text": option["text"],
                        }
                        for option in normalized["options"]
                    ]
                questions.append(normalized)
                continue

            if isinstance(node, dict) and isinstance(node.get("children"), list):
                walk(node["children"])

    walk(content if isinstance(content, list) else [])
    return questions


def find_mcq_question(content: list[Any], question_id: str) -> dict[str, Any] | None:
    for question in extract_mcq_questions(content, include_correct_answers=True):
        if question.get("id") == question_id:
            return question

    return None


def append_mcq_question(content: list[Any], node: dict[str, Any]) -> list[Any]:
    return append_mcq_questions(content, [node])


def append_mcq_questions(content: list[Any], nodes: list[dict[str, Any]]) -> list[Any]:
    updated_content = copy.deepcopy(content if isinstance(content, list) else [])
    question_number = len(extract_mcq_questions(updated_content, include_correct_answers=True))

    for node in nodes:
        question_number += 1
        updated_content.append(normalize_mcq_node(node, question_number))

    return normalize_chapter_content(updated_content)


def replace_mcq_question(
    content: list[Any],
    question_id: str,
    replacement_node: dict[str, Any],
) -> tuple[list[Any], bool]:
    found = False

    def replace_nodes(nodes: list[Any]) -> list[Any]:
        nonlocal found
        updated_nodes: list[Any] = []

        for node in nodes:
            if is_mcq_node(node) and node.get("id") == question_id:
                replacement = copy.deepcopy(replacement_node)
                replacement["id"] = question_id
                updated_nodes.append(replacement)
                found = True
                continue

            if isinstance(node, dict):
                updated_node = copy.deepcopy(node)
                children = updated_node.get("children")
                if isinstance(children, list):
                    updated_node["children"] = replace_nodes(children)
                updated_nodes.append(updated_node)
                continue

            updated_nodes.append(node)

        return updated_nodes

    updated_content = replace_nodes(copy.deepcopy(content if isinstance(content, list) else []))
    return normalize_chapter_content(updated_content), found


def delete_mcq_question(content: list[Any], question_id: str) -> tuple[list[Any], bool]:
    found = False

    def delete_nodes(nodes: list[Any]) -> list[Any]:
        nonlocal found
        updated_nodes: list[Any] = []

        for node in nodes:
            if is_mcq_node(node) and node.get("id") == question_id:
                found = True
                continue

            if isinstance(node, dict):
                updated_node = copy.deepcopy(node)
                children = updated_node.get("children")
                if isinstance(children, list):
                    updated_node["children"] = delete_nodes(children)
                updated_nodes.append(updated_node)
                continue

            updated_nodes.append(node)

        return updated_nodes

    updated_content = delete_nodes(copy.deepcopy(content if isinstance(content, list) else []))
    return normalize_chapter_content(updated_content), found


def calculate_mcq_score(
    question: dict[str, Any],
    selected_option_ids: list[str],
) -> dict[str, Any]:
    options = question.get("options", [])
    valid_option_ids = {str(option["id"]) for option in options}
    selected_ids = list(dict.fromkeys(str(option_id) for option_id in selected_option_ids))
    invalid_ids = [option_id for option_id in selected_ids if option_id not in valid_option_ids]

    if invalid_ids:
        raise ValueError(f"Invalid option ids: {', '.join(invalid_ids)}")

    correct_ids = {
        str(option["id"])
        for option in options
        if bool(option.get("is_correct"))
    }
    selected_id_set = set(selected_ids)
    is_correct = selected_id_set == correct_ids

    participation_points = float(question.get("participationPoints", 0.5))
    correctness_points = float(question.get("correctnessPoints", 0.5))
    total_points = float(question.get("totalPoints", 1))

    participation_earned_points = participation_points if selected_ids else 0
    correctness_earned_points = correctness_points if is_correct else 0
    earned_points = min(
        total_points,
        participation_earned_points + correctness_earned_points,
    )

    return {
        "selected_option_ids": selected_ids,
        "is_correct": is_correct,
        "earned_points": earned_points,
        "correctness_earned_points": correctness_earned_points,
        "participation_earned_points": participation_earned_points,
        "total_points": total_points,
        "correct_option_ids": sorted(correct_ids),
    }
