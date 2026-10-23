"""The thresholds and the file row, shared by measure.py and compare.py.

Imported only; nothing runs this file. They live apart from measure.py so the
comparison can judge a row without importing the entry point that prints it.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from languages import FunctionMeasure

# A test file by its name or by Maven's test tree: test_x.py, x_test.py,
# conftest.py, x.test.ts, x.spec.tsx, __tests__/, XTest.java, XTests.java,
# XIT.java, src/test/.
_TEST_FILE = re.compile(
    r"(^|/)(test_[^/]*\.py|[^/]*_test\.py|conftest\.py|[^/]*\.(test|spec)\.tsx?|[^/]*(Test|Tests|IT)\.java)$"
    r"|(^|/)(__tests__|src/test)/"
)


def is_test_file(file: str) -> bool:
    return bool(_TEST_FILE.search(file.replace("\\", "/")))


@dataclass
class FileMeasure:
    file: str
    language: str
    lines: int
    suppressions: int


@dataclass(frozen=True)
class Thresholds:
    lines: int = 20
    test_lines: int = 50
    cc: int = 10
    params: int = 3
    file_lines: int = 500
    depth: int = 2


def max_lines(fm: FunctionMeasure, t: Thresholds) -> int:
    """A test builds its data and states its expectations in line, so it gets more room."""
    return t.test_lines if is_test_file(fm.file) else t.lines


def exceeded(fm: FunctionMeasure, t: Thresholds) -> list[str]:
    out = []
    if fm.lines > max_lines(fm, t):
        out.append("lines")
    if fm.cc > t.cc:
        out.append("cc")
    if fm.params > t.params:
        out.append("params")
    if fm.depth > t.depth:
        out.append("depth")
    return out
