# Product Requirements Document (PRD)
# AI-Powered Wardrobe Configurator for a Carpentry Business

**Version:** 1.0 (Phased MVP)  
**Status:** Scope Approved  
**Audience:** Product Owner, Carpentry Specialists, Software Developers, AI Coding Agents  

---

## 1. Executive Summary & Objectives
A high-craft web application enabling customers to independently design custom wardrobes (hinged & sliding), visualize parametric configurations in interactive 3D, collaborate with an AI design agent, and submit verified technical design packages (BOM, 3D snapshots, dimensioned cut specs) to carpentry staff for manual quotation and revision management.

### Key Objectives
1. **Frictionless Scoping:** Zero-account anonymous entry with precise millimeter parametric configuration.
2. **Synchronized 3D parametric engine:** Real-time Three.js visualization matching structural constraints (doors open/close, hide doors, drawer inspection).
3. **Deterministic Rule Engine + AI Co-pilot:** AI proposes verified structural modifications with explicit customer accept/reject/undo safeguards.
4. **Carpentry Staff Dashboard:** Version-tracked inspection, engineering edits, client notes, BOM download, and manual quotation dispatch.

---

## 2. Core Architecture & Workflow
```
[Anonymous Customer] ──> [Parametric 3D Configurator] ──> [Deterministic Validation Engine]
                                    │                                  │
                                    ├─── [AI Design Co-pilot] ─────────┤ (Explicit Approval)
                                    ▼
                         [Quotation Request Submission]
                                    │
                                    ▼
[Carpentry Staff Portal] ──> [Review / Revise / BOM & PDF] ──> [Issue Formal Quotation]
```

---

## 3. Approved Specification Register
- **Wardrobe Types:** Straight hinged-door and sliding-door configurations.
- **Parametric Bounds:** Manual input of Width, Height, Depth (mm) with collision & span limits.
- **Fixed Code-defined Catalog:** Curated wood types (Oak, Walnut, Birch, Lacquered Ash), finishes, hardware handles, soft-close drawers, interior LED strips, and hanging rails.
- **Deliverables:** Technical package, BOM, 3D interactive model snapshot, validation reports, staff revision ledger.
