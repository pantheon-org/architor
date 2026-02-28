#!/usr/bin/env python3
"""
Hook: PostToolUse — Automatically logs state changes to decisions.md
"""

import json
import sys
import os
from datetime import datetime, timezone

ARCH_DIR = os.path.dirname(os.path.dirname(__file__))
STATE_FILE = os.path.join(ARCH_DIR, "state.json")
DECISIONS_FILE = os.path.join(ARCH_DIR, "decisions.md")


def get_state_summary():
    try:
        with open(STATE_FILE, "r") as f:
            state = json.load(f)
        return {
            "phase": state.get("current_phase", "unknown"),
            "decision_count": state.get("decision_count", 0),
            "project": state.get("project_name", "unnamed"),
        }
    except (FileNotFoundError, json.JSONDecodeError):
        return {"phase": "unknown", "decision_count": 0, "project": "unnamed"}


def ensure_decisions_file():
    if not os.path.exists(DECISIONS_FILE):
        with open(DECISIONS_FILE, "w") as f:
            f.write("# Architecture Decision Log\n\n")
            f.write(f"_Created: {datetime.now(timezone.utc).isoformat()}_\n\n")
            f.write("---\n\n")


def sanitize_md(value):
    """Strip markdown-active characters from logged values."""
    if not isinstance(value, str):
        value = str(value)
    return value.replace('|', '').replace('[', '').replace(']', '').replace('\n', ' ').replace('\r', '')[:200]


def append_state_snapshot(file_changed):
    ensure_decisions_file()
    summary = get_state_summary()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    phase = sanitize_md(summary['phase'])
    filename = sanitize_md(os.path.basename(file_changed))
    dec_count = summary['decision_count']
    entry = (
        f"_[{timestamp}] State change detected: "
        f"Phase={phase}, "
        f"File={filename}, "
        f"Decisions={dec_count}_\n\n"
    )
    with open(DECISIONS_FILE, "a") as f:
        f.write(entry)


def main():
    try:
        context = sys.stdin.read().strip()
        if context:
            data = json.loads(context)
            file_path = data.get("tool_input", {}).get("file_path", "unknown")
        else:
            file_path = "unknown"
    except (json.JSONDecodeError, AttributeError):
        file_path = "unknown"

    append_state_snapshot(file_path)
    sys.exit(0)


if __name__ == "__main__":
    main()
