import json
import re
import sys
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

import xlrd


SOURCE_ROOT = "https://www.zieit.edu.ua/wp-content/uploads/Rozklad/"
SOURCES = [
    ("Інститут · бакалаврат · 1 курс", "1.xls"),
    ("Інститут · бакалаврат · 2 курс", "2.xls"),
    ("Інститут · бакалаврат · 3 курс", "3.xls"),
    ("Інститут · бакалаврат · 4 курс", "4.xls"),
    ("Інститут · магістратура", "5.xls"),
    ("Фаховий коледж · 1 курс", "1k.xls"),
    ("Фаховий коледж · 2 курс", "2k.xls"),
    ("Фаховий коледж · 3 курс", "3k.xls"),
    ("Фаховий коледж · 4 курс", "4k.xls"),
    ("Заочна та дистанційна форма", "zo.xls"),
    ("Заочний коледж", "zc.xls"),
]
OUTPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("static-site/public/schedule.json")


def cell_text(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def parse_time(value):
    text = cell_text(value)
    if not text:
        return ""
    match = re.fullmatch(r"(\d{1,2})[.:](\d{2})", text)
    return f"{int(match.group(1)):02d}:{match.group(2)}" if match else text


def parse_workbook(content, course, filename):
    book = xlrd.open_workbook(file_contents=content)
    groups = []
    for sheet in book.sheets():
        header_index = None
        for row_index in range(min(sheet.nrows, 20)):
            row = [cell_text(sheet.cell_value(row_index, col)) for col in range(sheet.ncols)]
            next_row = [
                cell_text(sheet.cell_value(row_index + 1, col))
                for col in range(sheet.ncols)
            ] if row_index + 1 < sheet.nrows else []
            if row and "день" in row[0].lower() and next_row and "тижня" in next_row[0].lower():
                header_index = row_index
                break
        if header_index is None:
            continue

        headers = [cell_text(sheet.cell_value(header_index, col)) for col in range(sheet.ncols)]
        date_by_row = {}
        day_name = ""
        lessons = []
        for row_index in range(header_index + 1, sheet.nrows):
            first_cell = cell_text(sheet.cell_value(row_index, 0))
            date_match = re.search(r"(\d{2}\.\d{2}\.\d{4})", first_cell)
            if date_match:
                date_by_row[row_index] = (
                    datetime.strptime(date_match.group(1), "%d.%m.%Y").date()
                )
                day_name = first_cell.splitlines()[0].strip()

            number_value = sheet.cell_value(row_index, 2)
            time_value = sheet.cell_value(row_index, 3)
            if not isinstance(number_value, (int, float)) or not cell_text(time_value):
                continue

            class_date = next(
                (date for date_row, date in reversed(list(date_by_row.items())) if date_row <= row_index),
                None,
            )
            if class_date is None:
                continue

            for col in range(4, sheet.ncols):
                group_name = headers[col]
                subject = cell_text(sheet.cell_value(row_index, col))
                if not group_name or not subject:
                    continue
                details = [
                    cell_text(sheet.cell_value(detail_row, col))
                    for detail_row in range(row_index + 1, min(row_index + 4, sheet.nrows))
                ]
                details = [detail for detail in details if detail]
                lessons.append({
                    "group": group_name,
                    "date": class_date.isoformat(),
                    "day": day_name,
                    "week_start": (class_date - timedelta(days=class_date.weekday())).isoformat(),
                    "number": int(number_value),
                    "time": parse_time(time_value),
                    "subject": subject,
                    "details": details,
                })

        by_group = {}
        for lesson in lessons:
            by_group.setdefault(lesson["group"], []).append(lesson)
        group_names = [name for name in headers[4:] if name]
        for group_name in group_names:
            entries = by_group.get(group_name, [])
            groups.append({
                "id": f"{filename}:{sheet.name}:{group_name}",
                "course": course,
                "name": group_name,
                "label": f"{course} · {group_name}",
                "source_url": SOURCE_ROOT + filename,
                "lessons": entries,
            })
    return groups


def main():
    groups = []
    errors = []
    for course, filename in SOURCES:
        url = SOURCE_ROOT + filename
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "Podslushano-ZIEIT-Schedule/1.0"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                groups.extend(parse_workbook(response.read(), course, filename))
        except Exception as error:
            errors.append(f"{filename}: {error}")

    if not groups:
        raise RuntimeError("Could not load any official schedules: " + "; ".join(errors))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated_at": datetime.now().astimezone().isoformat(),
        "source_page": "https://www.zieit.edu.ua/?page_id=219",
        "groups": groups,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {len(groups)} groups to {OUTPUT}")
    for error in errors:
        print(f"Warning: {error}", file=sys.stderr)


if __name__ == "__main__":
    main()
