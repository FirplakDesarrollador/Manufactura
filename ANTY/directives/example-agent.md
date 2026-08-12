# Example Agent Directive

> [!NOTE]
> This is a placeholder directive following the 3-layer architecture.

## Goal
Demonstrate the orchestration of a deterministic Python script from a natural language directive.

## Inputs
- `name`: User's name
- `message`: Context for the script

## Workflow
1. Read input parameters.
2. Call `execution/example_script.py` with the provided inputs.
3. Return the result to the user.

## Edge Cases
- Script failure: Log error to `.tmp/error.log` and notify user.
