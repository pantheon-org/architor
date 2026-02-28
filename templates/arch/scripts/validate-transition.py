#!/usr/bin/env python3
"""
Hook: PreToolUse — Validates phase transitions in state.json
Exit 0 = allow the write
Exit 1 = block the write (Claude gets error message)
"""

import json
import sys
import os
import shutil

STATE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "state.json")

LEGAL_TRANSITIONS = {
    "not_started": ["evaluation"],
    "evaluation": ["methodology"],
    "methodology": ["components"],
    "components": ["finalization"],
    "finalization": []
}

def _check_all_components_accepted(state):
    """Dynamically verify all components are accepted instead of trusting a flag."""
    components = state.get("phases", {}).get("components", {}).get("components", {})
    if not components:
        return False
    return all(c.get("status") == "accepted" for c in components.values())


PREREQUISITES = {
    "methodology": {
        "check": lambda old: old["phases"]["evaluation"]["accepted"],
        "message": "BLOCKED: Phase 1 (Evaluation) must be accepted before moving to Methodology."
    },
    "components": {
        "check": lambda old: (
            old["phases"]["methodology"]["accepted"]
            and old["phases"]["methodology"]["pattern_accepted"]
            and old["phases"]["methodology"]["components_overview_accepted"]
            and old["phases"]["methodology"]["cross_cutting_accepted"]
        ),
        "message": "BLOCKED: Phase 2 — pattern, component overview, AND cross-cutting decisions must all be accepted."
    },
    "finalization": {
        "check": lambda old: _check_all_components_accepted(old),
        "message": "BLOCKED: All components must be accepted before Finalization."
    }
}

VALID_COMPONENT_TRANSITIONS = {
    "pending": ["in_progress"],
    "in_progress": ["awaiting_acceptance"],
    "awaiting_acceptance": ["accepted", "in_progress"],
    "accepted": [],
    "needs-review": ["in_progress"],
}

REQUIRED_KEYS = ["project_name", "current_phase", "phases", "decision_count"]
REQUIRED_PHASES = ["evaluation", "methodology", "components", "finalization"]
VALID_PHASES = {"not_started", "evaluation", "methodology", "components", "finalization"}


def load_current_state():
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def backup_state():
    """Backup state.json before allowing mutation."""
    if os.path.exists(STATE_FILE):
        backup_path = STATE_FILE + ".bak"
        try:
            shutil.copy2(STATE_FILE, backup_path)
        except Exception as e:
            print(f"WARNING: State backup failed: {e}", file=sys.stderr)


def validate_schema(state):
    """Validate that state.json has the required structure and types."""
    for key in REQUIRED_KEYS:
        if key not in state:
            return False, f"BLOCKED: state.json missing required key: '{key}'"

    # Type checks
    if not isinstance(state.get("current_phase"), str):
        return False, "BLOCKED: 'current_phase' must be a string."
    if not isinstance(state.get("phases"), dict):
        return False, "BLOCKED: 'phases' must be an object."
    if not isinstance(state.get("decision_count"), (int, float)):
        return False, "BLOCKED: 'decision_count' must be a number."
    if not isinstance(state.get("project_name"), str):
        return False, "BLOCKED: 'project_name' must be a string."

    phases = state.get("phases", {})
    for phase_name in REQUIRED_PHASES:
        if phase_name not in phases:
            return False, f"BLOCKED: state.json missing required phase: '{phase_name}'"
        if not isinstance(phases[phase_name], dict):
            return False, f"BLOCKED: Phase '{phase_name}' must be an object."

    return True, ""


def validate_phase_transition(old_state, new_state):
    phase_order = ["not_started", "evaluation", "methodology", "components", "finalization"]
    old_phase = old_state["current_phase"]
    new_phase = new_state["current_phase"]

    if old_phase not in VALID_PHASES:
        return False, f"BLOCKED: Current phase '{old_phase}' is not a recognized phase."
    if new_phase not in VALID_PHASES:
        return False, f"BLOCKED: Target phase '{new_phase}' is not a recognized phase."

    if old_phase == new_phase:
        return True, ""

    old_idx = phase_order.index(old_phase)
    new_idx = phase_order.index(new_phase)

    # Backward transitions are handled by validate_no_backward_phase
    if new_idx < old_idx:
        return True, ""

    # Forward transition — must be exactly one step forward
    if new_phase not in LEGAL_TRANSITIONS.get(old_phase, []):
        return False, (
            f"BLOCKED: Cannot transition from '{old_phase}' to '{new_phase}'. "
            f"Legal transitions from '{old_phase}': {LEGAL_TRANSITIONS.get(old_phase, [])}"
        )

    if new_phase in PREREQUISITES:
        prereq = PREREQUISITES[new_phase]
        try:
            if not prereq["check"](old_state):
                return False, prereq["message"]
        except (KeyError, TypeError) as e:
            return False, f"BLOCKED: Cannot verify prerequisites — state data incomplete: {e}"

    return True, ""


def validate_no_backward_phase(old_state, new_state):
    phase_order = ["not_started", "evaluation", "methodology", "components", "finalization"]
    old_phase = old_state["current_phase"]
    new_phase = new_state["current_phase"]

    if old_phase not in VALID_PHASES or new_phase not in VALID_PHASES:
        return False, f"BLOCKED: Unrecognized phase in transition '{old_phase}' → '{new_phase}'."

    old_idx = phase_order.index(old_phase)
    new_idx = phase_order.index(new_phase)

    if new_idx < old_idx:
        # Allow backward transition ONLY during a reopen
        new_reopens = new_state.get("reopens", {})
        old_reopens = old_state.get("reopens", {})
        new_count = new_reopens.get("count", 0)
        old_count = old_reopens.get("count", 0)

        if new_count > old_count:
            # This is a reopen operation — check limits
            max_reopens = old_reopens.get("max", 2)
            if new_count > max_reopens:
                return False, (
                    f"BLOCKED: Maximum reopens exceeded ({new_count} > {max_reopens})."
                )
            return True, ""

        return False, (
            f"BLOCKED: Cannot go backwards from '{old_phase}' to '{new_phase}'. "
            f"Phase transitions are forward-only. Use /reopen to go back "
            f"(limited to {old_reopens.get('max', 2)} total)."
        )
    return True, ""


def validate_component_transitions(old_state, new_state):
    old_components = old_state.get("phases", {}).get("components", {}).get("components", {})
    new_components = new_state.get("phases", {}).get("components", {}).get("components", {})

    for comp_name, new_comp in new_components.items():
        new_status = new_comp.get("status", "pending")
        if comp_name in old_components:
            old_status = old_components[comp_name].get("status", "pending")
            if old_status != new_status:
                # During a reopen, accepted → needs-review is allowed
                if old_status == "accepted" and new_status == "needs-review":
                    new_reopens = new_state.get("reopens", {})
                    old_reopens = old_state.get("reopens", {})
                    if new_reopens.get("count", 0) > old_reopens.get("count", 0):
                        continue  # Allow during reopen

                valid_next = VALID_COMPONENT_TRANSITIONS.get(old_status, [])
                if new_status not in valid_next:
                    return False, (
                        f"BLOCKED: Component '{comp_name}' cannot transition from "
                        f"'{old_status}' to '{new_status}'. Valid transitions: {valid_next}"
                    )

    # Only one component can be active at a time
    active_components = [
        name for name, comp in new_components.items()
        if comp.get("status") in ("in_progress", "awaiting_acceptance")
    ]
    if len(active_components) > 1:
        return False, (
            f"BLOCKED: Only one component can be active at a time. "
            f"Active components: {active_components}"
        )

    return True, ""


def validate_new_components_status(old_state, new_state):
    """New components must start as 'pending', not 'accepted'."""
    old_components = old_state.get("phases", {}).get("components", {}).get("components", {})
    new_components = new_state.get("phases", {}).get("components", {}).get("components", {})

    for comp_name, new_comp in new_components.items():
        if comp_name not in old_components:
            status = new_comp.get("status", "pending")
            if status != "pending":
                return False, (
                    f"BLOCKED: New component '{comp_name}' must start with status 'pending', "
                    f"not '{status}'. Components cannot be injected as '{status}'."
                )
    return True, ""


def validate_no_component_deletion(old_state, new_state):
    """Accepted components cannot be silently deleted."""
    old_components = old_state.get("phases", {}).get("components", {}).get("components", {})
    new_components = new_state.get("phases", {}).get("components", {}).get("components", {})

    for comp_name, old_comp in old_components.items():
        if comp_name not in new_components:
            if old_comp.get("status") == "accepted":
                return False, (
                    f"BLOCKED: Cannot remove accepted component '{comp_name}'. "
                    f"Use /reopen to modify accepted components."
                )
    return True, ""


def block(message):
    print(message, file=sys.stderr)
    print(message)
    sys.exit(1)


def main():
    try:
        proposed_content = sys.stdin.read(1_048_576).strip()  # 1MB limit
        if not proposed_content:
            block("BLOCKED: Empty state data provided.")
        new_state = json.loads(proposed_content)
    except json.JSONDecodeError as e:
        block(f"BLOCKED: Invalid JSON in proposed state: {e}")

    # Always validate schema, even on first write
    is_valid, message = validate_schema(new_state)
    if not is_valid:
        block(message)

    current_state = load_current_state()
    if current_state is None:
        # First write ever — schema validated above, allow it
        sys.exit(0)

    if current_state.get("current_phase") == "not_started" and not current_state.get("project_name"):
        # Initializing a fresh project — schema validated, allow it
        sys.exit(0)

    # Backup current state before allowing mutation
    backup_state()

    validations = [
        validate_phase_transition,
        validate_no_backward_phase,
        validate_component_transitions,
        validate_new_components_status,
        validate_no_component_deletion,
    ]

    for validation in validations:
        is_valid, message = validation(current_state, new_state)
        if not is_valid:
            block(message)

    sys.exit(0)


if __name__ == "__main__":
    main()
