#!/usr/bin/env python3
"""Red fixture: each forbidden word must fail the UTNP copy check."""
from pathlib import Path
from rp_lint import ROOT, check_event_banned

fixture = (Path(__file__).parent / "fixtures/utnp_banned_copy.txt").read_text(encoding="utf-8")
for path in ("assets/utnp.js", "events/utnp.json"):
    hits = check_event_banned(str(Path(ROOT) / path), fixture)
    assert {word for _, word in hits} >= {"추천", "예방", "보호"}, (path, hits)

gpx = "if(document.documentElement.classList.contains('utnp')){L.f2='추천·예방·보호';}\n"
hits = check_event_banned(str(Path(ROOT) / "gpx/index.html"), gpx)
assert {word for _, word in hits} >= {"추천", "예방", "보호"}, hits
assert not check_event_banned(str(Path(ROOT) / "gpx/index.html"), "var unrelated='추천';\n")
print("PASS UTNP 금칙어 빨간 픽스처와 공유 카드 검사")
