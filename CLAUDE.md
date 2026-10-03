# Valoria - Project Instructions

## Codebase Navigation & Architecture (Graphify)
- **Always Check Graph First**: When answering questions about architecture, file relations, call chains, or data flow, check if `graphify-out/graph.json` exists.
- If `graphify-out/graph.json` is present:
  - DO NOT read through files from scratch or run exhaustive grep searches across the repository.
  - Run `graphify query "<question>"` (or inline NetworkX traversal on `graphify-out/graph.json`) first to locate relevant nodes, relationships, and communities.
  - Only open specific files when targeting exact lines/locations pinpointed by the graph (`source_location`).
- After making significant code modifications or adding new files, keep the graph synchronized with `graphify --update` (or ensure git hooks are installed via `graphify hook install`).

## Project Stack & Standards
- Modular JavaScript architecture (ES Modules).
- Combat, animation, state machine, and entity separation.
