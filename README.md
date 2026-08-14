# 2학년 4반 학생별 시간표 웹앱

2-4반 학생이 이름, 번호, 학번 중 아무 값이나 입력해서 본인 시간표를 바로 확인할 수 있는 웹앱입니다.

## 실행 방법

```bash
cd /workspaces/timetable26_2
python3 -m http.server 5500
```

브라우저 접속: http://localhost:5500

## 현재 반영 데이터

- PDF 원본: `2-4.pdf`
- 생성 데이터: `data/students.from-pdf.json` (총 34명)
- 데이터 추출 스크립트: `scripts/parse_pdf.py`

PDF를 다시 받으면 아래 명령으로 데이터만 재생성하면 됩니다.

```bash
cd /workspaces/timetable26_2
python3 scripts/parse_pdf.py
```

## 주요 동작

- 초기 화면에는 검색창만 보임
- 검색창에 이름/번호/학번 어떤 값이든 입력하면 자동 검색
- 검색 결과가 1명으로 확정되면 시간표 즉시 표시
- 동명이인 등 복수 매칭이면 더 구체적 입력 안내
- 시간표 셀 정보 표시
  - 과목명
  - 담당교사
  - 강의실
- A/B/C/D 블록 배정 시간 반영
  - A: 월 5,6 / 목 4,5
  - B: 월 1,2 / 화 5,6
  - C: 화 1,2 / 목 1,2
  - D: 화 3 / 목 3 / 금 1,2
- 교시 규칙 반영
  - 월/수/금 7교시
  - 화/목 6교시
  - 수 6,7 창체

## 파일 구성

- `index.html`: 검색 화면 + 시간표 화면 구조
- `styles.css`: UI 스타일
- `app.js`: 검색/시간표 렌더링 로직
- `scripts/parse_pdf.py`: PDF -> JSON 추출
- `data/students.from-pdf.json`: PDF 추출 결과
