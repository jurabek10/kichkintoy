# Security Review — <FEATURE NAME>

> Copy this file to `docs/security/reviews/<feature>-<date>.md` and fill it in (or have an LLM fill it). Score against [`security-checklist.md`](./security-checklist.md). **Gate: no open Critical or High → may merge.**
>
> **Prompt to give an LLM:** *"You are doing a security review. Inputs: (1) `docs/security/security-checklist.md` (the standard), (2) this template, (3) the feature diff below / branch `<name>`. Review only the changed code and what it touches. Fill in every section. For each checklist ID, mark Pass/Fail/N/A with a one-line reason and a `file:line`. List concrete findings with severity, exact location, and a fix. End with a verdict. Do not invent issues; if unsure, mark Needs-info."*

## 1. Subject

| | |
|---|---|
| Feature / spec | <e.g. notices-spec.md> |
| Branch / PR | <branch> |
| Date | <YYYY-MM-DD> |
| Reviewer | <name / model> |
| Files reviewed | <list of changed files> |
| New endpoints | <list, with method + path + guard> |
| New tables/columns | <list> |
| New deps | <list> |

## 2. Verdict

- [ ] **Pass** — no Critical/High; merge ok.
- [ ] **Pass with required fixes** — listed Medium/Low fixed or ticketed; no Critical/High.
- [ ] **Blocked** — open Critical/High (see findings).

**One-paragraph summary:** <what the feature does, the main risk surface, overall posture>

## 3. Findings

> One row per issue. Severity per the checklist. `Status`: Open / Fixed / Accepted-risk / Needs-info.

| ID | Severity | Checklist ref | Location (`file:line`) | Issue | Recommendation | Status |
|----|----------|---------------|------------------------|-------|----------------|--------|
| F1 | | | | | | |
| F2 | | | | | | |

## 4. Checklist results

> Mark every applicable item. `N/A` is fine with a reason (e.g. "feature touches no media"). Expand only the categories the feature touches; mark whole categories N/A otherwise.

### AUTHZ — Authorization & tenant isolation
| ID | Result | Reason / evidence (`file:line`) |
|----|--------|----------------------------------|
| AUTHZ-1 | | |
| AUTHZ-2 | | |
| AUTHZ-3 | | |
| AUTHZ-4 | | |
| AUTHZ-5 | | |
| AUTHZ-6 | | |
| AUTHZ-7 | | |

### AUTHN — Authentication & session
| ID | Result | Reason / evidence |
|----|--------|-------------------|
| AUTHN-1 | | |
| AUTHN-2 | | |
| AUTHN-3 | | |
| AUTHN-4 | | |
| AUTHN-5 | | |
| AUTHN-6 | | |

### PRIV — Children's data & privacy
| ID | Result | Reason / evidence |
|----|--------|-------------------|
| PRIV-1 | | |
| PRIV-2 | | |
| PRIV-3 | | |
| PRIV-4 | | |
| PRIV-5 | | |

### INPUT — Validation & output
| ID | Result | Reason / evidence |
|----|--------|-------------------|
| INPUT-1 | | |
| INPUT-2 | | |
| INPUT-3 | | |
| INPUT-4 | | |
| INPUT-5 | | |

### RATE — Rate limiting & abuse
| ID | Result | Reason / evidence |
|----|--------|-------------------|
| RATE-1 | | |
| RATE-2 | | |
| RATE-3 | | |

### PAY — Payments & webhooks
| ID | Result | Reason / evidence |
|----|--------|-------------------|
| PAY-1 | | |
| PAY-2 | | |
| PAY-3 | | |
| PAY-4 | | |

### MEDIA — Uploads & R2
| ID | Result | Reason / evidence |
|----|--------|-------------------|
| MEDIA-1 | | |
| MEDIA-2 | | |
| MEDIA-3 | | |

### AUDIT — Logging
| ID | Result | Reason / evidence |
|----|--------|-------------------|
| AUDIT-1 | | |
| AUDIT-2 | | |
| AUDIT-3 | | |

### DATA — Model & transactions
| ID | Result | Reason / evidence |
|----|--------|-------------------|
| DATA-1 | | |
| DATA-2 | | |
| DATA-3 | | |

### SECRETS / DEPS / INFRA / LEGAL
| ID | Result | Reason / evidence |
|----|--------|-------------------|
| SECRETS-1 | | |
| SECRETS-2 | | |
| SECRETS-3 | | |
| DEPS-1 | | |
| INFRA-1 | | |
| INFRA-2 | | |
| LEGAL-1 | | |
| LEGAL-2 | | |

## 5. Abuse cases tested / to test

> Concrete attacker attempts. Mark result.

- [ ] Call each new endpoint with **another center's valid id** → expect 403/404, no data. (AUTHZ-4)
- [ ] Call as a **parent of a different child** → denied. (PRIV-1)
- [ ] Call a **director-only** action as parent/teacher → denied. (AUTHZ-5)
- [ ] Send the abusable endpoint in a **tight loop** → throttled. (RATE-1)
- [ ] Submit a body with **extra/forbidden fields** (`status`, `centerId`, `*UserId`) → ignored. (INPUT-3)
- [ ] <feature-specific abuse case>

## 6. Required follow-ups

| Item | Severity | Owner | Tracking |
|------|----------|-------|----------|
| | | | |

## 7. Sign-off

- Reviewer: <name> — <date>
- Re-review needed after fixes? **Yes / No**
