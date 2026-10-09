@AGENTS.md

# Working style

Always take the simplest approach that does the job, to senior standards: the
fewest moving parts a reviewer would sign off on.

- Prefer what a dependency or the platform already does over code that
  re-implements it. If a library already reads an env var, parses its own
  config or validates its own input, configure it — don't wrap it.
- Don't add a helper, abstraction or indirection until a second caller needs
  it. One call site is not a pattern.
- Leave no scaffolding behind: no unused helpers, no comments describing code
  that is no longer there.
