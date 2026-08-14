from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader

PDF_PATH = Path("2-4.pdf")
OUT_PATH = Path("data/students.from-pdf.json")

# Example header: "2026학년도 2학년 2학기 4반 1번 고해민"
HEADER_RE = re.compile(r"4반\s*(\d+)번\s*([가-힣]+)")

# Example row:
# "진로 선택 법과 사회(4) 2-6 D 김현 Y Y"
# "융합 선택 음악과 미디어(4) 음악실1_음미 C 윤혜민 Y Y"
# Matches subject(N) then the rest up to Y Y
# Structure: ...[classification] subject(N) room BLOCK teacher(s) Y Y
LINE_RE = re.compile(
    r"^(.+?)\(\d+\)\s+(.+?)\s+([ABCD])\s+(.+?)\s+Y\s+Y$"
)


def clean_subject(raw: str) -> str:
    s = raw.strip()
    # strip leading /한문, 한문, 일반/진로/융합 선택 prefixes
    s = re.sub(r"^/?\s*한문\s*", "", s)
    s = re.sub(r"^(?:일반|진로|융합)\s*선택\s*", "", s)
    return s.strip()


def clean_room(room: str) -> str:
    """Replace underscored shorthand with readable form."""
    room = room.strip()
    # e.g. 미술실1_미매 -> 미술실1, AI 창의실_인지초 -> AI창의실
    room = re.sub(r"_[^\s]+$", "", room)
    return room.strip()


def parse_page(text: str) -> dict | None:
    header = HEADER_RE.search(text)
    if not header:
        return None

    number = header.group(1).strip()
    name = header.group(2).strip()

    blocks: dict[str, dict[str, str]] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line.endswith("Y Y"):
            continue

        match = LINE_RE.search(line)
        if not match:
            continue

        raw_subject = match.group(1)
        room = clean_room(match.group(2))
        block = match.group(3)
        teacher = match.group(4).strip()
        # Append T suffix only if not already there
        if not teacher.endswith("T"):
            teacher = teacher + "T"

        subject = clean_subject(raw_subject)
        if not subject:
            continue

        blocks[block] = {
            "subject": subject,
            "teacher": teacher,
            "room": room,
        }

    return {
        "studentId": "",
        "number": number,
        "name": name,
        "blocks": {
            "A": blocks.get("A", {}),
            "B": blocks.get("B", {}),
            "C": blocks.get("C", {}),
            "D": blocks.get("D", {}),
        },
    }


def main() -> None:
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    reader = PdfReader(str(PDF_PATH))
    students: list[dict] = []

    for page in reader.pages:
        text = page.extract_text() or ""
        student = parse_page(text)
        if student:
            students.append(student)

    # Sort by number for stable output.
    students.sort(key=lambda x: int(x["number"]))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(students, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"students parsed: {len(students)}")
    print(f"saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
