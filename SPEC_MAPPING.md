# SPEC_MAPPING

## What We Have Built Now (Draft / Local)
- Local login gate for `/app` using browser storage/cookie flow.
- Draft nodes with statuses (`proposed`, `committed`, `archived`).
- Typed node relationships (`depends_on`, `enables`, `relates_to`).
- Views pages for Decisions, Requirements, and Business relationship listing.
- Local audit log for node commit events.
- Guided proposals templates (Decision / Requirement / KPI).
- Demo data load/reset and full local bundle export/import.

## What Is Intentionally Temporary
- All data is local only (browser storage), no shared persistence.
- Auth/gating is prototype-only, not production security.
- Commit/lock behavior is UI-level prototype logic.
- Validation and governance rules are intentionally lightweight.

## After Master Spec Update (Planned)
- Database-backed persistence and multi-user data model.
- Formal governance/commit rules and policy enforcement.
- Server-side audit integrity and immutable event history.
- Structured relationship semantics and validation constraints.
- Role/permission model aligned to updated specification.

## Open Questions For Updated Spec
- What are final node/entity schemas and required fields?
- What are authoritative commit/lock/governance rules?
- Which relationship types and constraints are mandatory?
- What is the required audit retention and integrity model?
- What roles/permissions and approval flows are required?
