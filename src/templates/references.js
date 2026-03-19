import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadCSV(name) {
  try {
    return readFileSync(join(__dirname, 'data', name), 'utf-8');
  } catch {
    // Fallback: return minimal CSV if data files not bundled
    if (name === 'domain-complexity.csv') return DOMAIN_COMPLEXITY_CSV;
    if (name === 'project-types.csv') return PROJECT_TYPES_CSV;
    return '';
  }
}

export function references(c) {
  const a = c.apedDir;
  return [
    {
      path: `${a}/aped-a/references/research-prompts.md`,
      content: RESEARCH_PROMPTS,
    },
    {
      path: `${a}/aped-p/references/fr-rules.md`,
      content: FR_RULES,
    },
    {
      path: `${a}/aped-p/references/domain-complexity.csv`,
      content: loadCSV('domain-complexity.csv'),
    },
    {
      path: `${a}/aped-p/references/project-types.csv`,
      content: loadCSV('project-types.csv'),
    },
    {
      path: `${a}/aped-e/references/epic-rules.md`,
      content: EPIC_RULES,
    },
    {
      path: `${a}/aped-d/references/tdd-engine.md`,
      content: TDD_ENGINE,
    },
    {
      path: `${a}/aped-r/references/review-criteria.md`,
      content: REVIEW_CRITERIA,
    },
    {
      path: `${a}/aped-ux/references/ux-patterns.md`,
      content: UX_PATTERNS,
    },
  ];
}

const RESEARCH_PROMPTS = `# Research Agent Prompts

Use these prompts when launching the 3 parallel research agents in the Analyze phase.

## Agent 1: Market Research

You are a market research analyst. Investigate the following for the project idea provided:

### Questions to Answer
1. **Customer Behavior**: How do target users currently solve this problem? What tools/workarounds do they use?
2. **Pain Points**: What are the top 3-5 frustrations with existing solutions? Where do users drop off or give up?
3. **Competitive Landscape**: Who are the direct competitors? Indirect competitors? What are their strengths and weaknesses?
4. **Market Size**: What is the TAM/SAM/SOM? Is the market growing, stable, or declining?
5. **Pricing Models**: How do competitors price? Freemium, subscription, usage-based, one-time?
6. **Distribution**: How do competitors acquire users? What channels work in this space?

### Output Format
\`\`\`markdown
## Market Research Findings

### Customer Behavior & Pain Points
- [findings with sources]

### Competitive Landscape
| Competitor | Strengths | Weaknesses | Pricing |
|------------|-----------|------------|---------|

### Market Size & Trends
- [TAM/SAM/SOM estimates with sources]

### Key Insights
- [3-5 actionable insights]
\`\`\`

### WebSearch Usage
Search for: \`{product_domain} market size {current_year}\`, \`{competitor_names} review\`, \`{target_user} pain points {product_domain}\`

---

## Agent 2: Domain Research

You are a domain analyst. Investigate the industry and regulatory landscape:

### Questions to Answer
1. **Industry Trends**: What are the top 3 trends shaping this domain? What's emerging?
2. **Regulations**: What compliance requirements exist? (GDPR, HIPAA, PCI-DSS, SOC2, etc.)
3. **Standards**: What industry standards or certifications are relevant?
4. **Barriers to Entry**: What are the technical, legal, or financial barriers?
5. **Ecosystem**: What platforms, APIs, or integrations are essential in this space?

### Output Format
\`\`\`markdown
## Domain Research Findings

### Industry Trends
- [trend with evidence]

### Regulatory & Compliance
- [regulation: requirement and impact]

### Standards & Certifications
- [standard: relevance]

### Barriers & Ecosystem
- [barrier/integration: details]
\`\`\`

### WebSearch Usage
Search for: \`{domain} regulations {current_year}\`, \`{domain} industry trends\`, \`{domain} compliance requirements software\`

---

## Agent 3: Technical Research

You are a technical architect. Investigate technology options and patterns:

### Questions to Answer
1. **Tech Stack Options**: What frameworks, languages, and tools are best suited? Why?
2. **Architecture Patterns**: What architecture patterns do successful products in this space use?
3. **Integration Points**: What third-party APIs, services, or platforms need integration?
4. **Open Source**: What open-source tools and libraries are available and mature?
5. **Scalability Considerations**: What technical decisions will impact scaling?
6. **Developer Experience**: What SDKs, docs, and tooling exist in this ecosystem?

### Output Format
\`\`\`markdown
## Technical Research Findings

### Recommended Tech Stack
- [technology: rationale]

### Architecture Patterns
- [pattern: when to use, trade-offs]

### Integration Points
| Service/API | Purpose | Maturity | Notes |
|-------------|---------|----------|-------|

### Open Source Tools
- [tool: purpose, stars/activity, license]

### Scalability Notes
- [consideration: impact]
\`\`\`

### WebSearch Usage
Search for: \`{tech_stack} best practices {current_year}\`, \`{product_type} architecture patterns\`, \`{integration_name} API documentation\`
`;

const FR_RULES = `# Functional Requirements Quality Rules

## FR Format

Every FR MUST follow this format:
\`\`\`
FR#: [Actor] can [capability] [context/constraint]
\`\`\`

### Examples
- \`FR1: User can create an account using email and password\`
- \`FR12: Admin can export user data as CSV filtered by date range\`
- \`FR25: System can process payment transactions within 3 seconds\`

### Actors
Use specific actors, not generic ones:
- **Good**: User, Admin, Manager, System, API Consumer
- **Bad**: Someone, People, Anyone, They

## Anti-Patterns (MUST NOT appear in FRs)

### Subjective Adjectives
These words are unmeasurable and untestable:
- ~~easy~~ — specify the number of steps or clicks
- ~~intuitive~~ — specify the interaction pattern
- ~~fast~~ — specify the time threshold (e.g., "within 2 seconds")
- ~~responsive~~ — specify the breakpoints or time limits
- ~~simple~~ — specify the complexity constraints

### Vague Quantifiers
These words hide undefined scope:
- ~~multiple~~ — specify the exact number or range (e.g., "up to 10")
- ~~several~~ — specify the count
- ~~various~~ — list the specific items

### Implementation Leakage
FRs describe WHAT, not HOW:
- **Bad**: \`FR5: User can login using React form with JWT tokens\`
- **Good**: \`FR5: User can authenticate with email and password\`
- No technology names (React, PostgreSQL, Redis)
- No implementation details (JWT, REST, WebSocket)
- No specific libraries or frameworks

## NFR Format

\`\`\`
The system shall [metric] [condition] [measurement method]
\`\`\`

### Examples
- \`The system shall respond to API requests within 200ms at the 95th percentile under normal load\`
- \`The system shall support 10,000 concurrent users without degradation\`
- \`The system shall achieve WCAG 2.1 AA compliance on all public pages\`

### NFR Categories (include only when relevant)
- **Performance**: response times, throughput, resource usage
- **Security**: authentication, authorization, encryption, compliance
- **Scalability**: concurrent users, data volume, geographic distribution
- **Accessibility**: WCAG level, assistive technology support
- **Integration**: API compatibility, data format standards, protocol support

## Information Density Rules

- Every sentence carries weight — zero fluff
- No preambles ("In order to provide...", "The system should aim to...")
- No redundant context (if it's in the Product Scope, don't repeat in FRs)
- One FR = one capability (no compound FRs with "and" joining unrelated actions)
`;

const EPIC_RULES = `# Epic & Story Design Rules

## Epic Design Principles

### 1. User Value First
Each epic delivers COMPLETE functionality for its domain. Epics are organized by what users can DO, not by technical layers.

**Correct patterns:**
- "User Authentication and Profiles" — complete auth system end-to-end
- "Content Management" — full CRUD for content with publishing
- "Payment Processing" — billing, subscriptions, invoicing

**Wrong patterns:**
- "Database Setup" — no user value, technical layer
- "API Development" — no user value, technical layer
- "Frontend Components" — no user value, technical layer
- "Infrastructure" — exception: acceptable as Epic 1 if project needs scaffolding

### 2. Independence
- Each epic stands alone — no forward dependencies between epics
- Epic N should NOT require Epic N+1 to be useful
- If epics are interdependent, merge them or restructure

### 3. User-Outcome Naming
Epic names describe outcomes:
- "Users can manage their accounts" not "Account Module"
- "Team collaboration and sharing" not "Sharing Feature"

## Story Design Rules

### Format
\`\`\`
As a [role], I want [capability], so that [benefit].
\`\`\`

### Acceptance Criteria
Use Given/When/Then format:
\`\`\`
Given [context/precondition],
When [action/trigger],
Then [expected outcome].
\`\`\`

Minimum 1 AC per story. Each AC must be independently testable.

### Sizing
- Each story completable in **1 dev session** (single agent invocation)
- If a story has more than 8 tasks, split it
- If a story touches more than 5 files, consider splitting

### Dependency Rules
- No forward dependencies between stories within an epic
- Stories should be implementable in listed order but not REQUIRE that order
- Exception: Epic 1 Story 1 (setup) must come first if it scaffolds the project

### Database Rule
- DB tables/schemas created ONLY when the story that needs them is implemented
- Do NOT create all tables upfront in a "database story"
- Each story creates its own tables as part of implementation

### Starter Template Rule
If the project needs initial scaffolding:
- Epic 1, Story 1 = "Project Setup"
- Covers: project init, dependency install, config files, basic structure
- All subsequent stories build on this foundation

## Validation Gates

### Gate 1: FR Coverage
- Every FR from PRD mapped to exactly one epic
- No orphan FRs, no phantom FRs

### Gate 2: Architecture Compliance
- Stories respect project architecture (from project-context or PRD)
- No stories that violate stated technical decisions

### Gate 3: Story Quality
- Every story has: user story format, ACs in Given/When/Then, tasks with checkboxes
- No story exceeds single-session size

### Gate 4: Epic Structure
- Epics organized by user value
- No technical-layer epics (except setup)
- No forward dependencies
`;

const TDD_ENGINE = `# TDD Engine — Red-Green-Refactor Rules

## Core Cycle

### RED — Write Failing Test First
1. Read the task and its AC reference
2. Write test(s) that verify the expected behavior
3. Run tests — they MUST fail (if they pass, the test is wrong or the feature already exists)
4. If test doesn't fail: re-examine the test, ensure it actually tests new behavior

### GREEN — Minimal Implementation
1. Write the MINIMUM code to make the failing test pass
2. No extra features, no premature optimization
3. Run tests — they MUST pass
4. If tests fail: fix the implementation, not the test (unless the test was wrong)

### REFACTOR — Improve While Green
1. Improve code structure, naming, duplication
2. Run tests after each refactor step — they MUST stay green
3. No new behavior in refactor phase

## Gate Checklist (5 conditions — ALL required before marking \`[x]\`)

- [ ] **Tests exist** — at least one test covers this task's behavior
- [ ] **Tests pass 100%** — all tests for this task pass
- [ ] **Implementation matches** — code does exactly what the task describes, no more
- [ ] **ACs satisfied** — all linked ACs have code evidence
- [ ] **No regressions** — full test suite passes, not just this task's tests

## HALT Conditions

### Immediate HALT (ask user):
- **New dependency needed** — library, service, or API not in Dev Notes
- **3 consecutive failures** — same test failing after 3 fix attempts
- **Missing config** — environment variable, API key, or service not available
- **Ambiguity** — task or AC interpretation unclear

### Do NOT halt:
- Minor warnings that don't affect functionality
- Style preferences (follow existing patterns)
- Optional improvements not in task scope

## Sprint Status Update Rules

### Story Status Transitions
\`\`\`
backlog -> ready-for-dev -> in-progress -> review -> done
                                    ^              |
                                    +--------------+
                                   (if review finds issues)
\`\`\`

### Epic Status Rules
- Epic -> \`in-progress\` when its first story moves to \`in-progress\`
- Epic -> \`done\` when ALL its stories are \`done\`

## Review Continuation Protocol

When a story returns from review with \`[AI-Review]\` items:

1. Story status will be \`in-progress\` (set by aped-r)
2. Look for items formatted as: \`[AI-Review][Severity] Description [file:line]\`
3. Address ALL \`[AI-Review]\` items BEFORE continuing with regular tasks
4. For each item:
   - Read the cited file:line
   - Apply the fix following TDD (write test for the issue, fix, verify)
   - Remove the \`[AI-Review]\` tag once resolved

## Writable Sections in Story File

Only modify these sections during development:
- **Tasks**: Mark checkboxes \`[x]\` as tasks complete
- **Dev Agent Record**: Fill in model, timestamps, debug log, completion notes, file list

Do NOT modify: User Story, Acceptance Criteria, Dev Notes (these are the spec).

## Definition of Done (25-item checklist)

### Code Quality (5)
- [ ] No commented-out code
- [ ] No TODO/FIXME without linked issue
- [ ] Functions < 50 lines
- [ ] No duplicate logic
- [ ] Consistent naming conventions

### Testing (5)
- [ ] All new code has tests
- [ ] Tests are deterministic (no flaky tests)
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] Full suite passes

### Security (5)
- [ ] Input validation on all user inputs
- [ ] No hardcoded secrets
- [ ] Authentication checks where needed
- [ ] Authorization checks where needed
- [ ] No SQL/command injection vectors

### Documentation (5)
- [ ] Complex logic has comments
- [ ] Public APIs documented
- [ ] Config changes documented
- [ ] Migration steps documented (if applicable)
- [ ] Dev Agent Record filled

### Integration (5)
- [ ] No breaking changes to existing APIs
- [ ] Database migrations are reversible
- [ ] Environment variables documented
- [ ] Dependencies are pinned
- [ ] CI/CD pipeline passes (if applicable)
`;

const REVIEW_CRITERIA = `# Adversarial Review Criteria

## Severity Definitions

| Severity | Definition | Action |
|----------|-----------|--------|
| **CRITICAL** | Task marked done with no code evidence, security vulnerability, data loss risk | Must fix immediately |
| **HIGH** | AC not implemented, files in story but no changes, broken functionality | Must fix before done |
| **MEDIUM** | Files changed but not in story list, code quality issues, missing error handling | Fix or document |
| **LOW** | Minor improvements, style inconsistencies, optional optimizations | Note for future |

## Review Protocols

### 1. AC Validation Protocol

For EACH acceptance criteria in the story:

1. Read the AC (Given/When/Then)
2. Search codebase for implementation evidence
3. Find the specific file:line that satisfies each part:
   - **Given**: setup/precondition code
   - **When**: trigger/action code
   - **Then**: outcome/assertion code
4. Rate:
   - **IMPLEMENTED**: clear code evidence for all three parts
   - **PARTIAL**: some parts implemented, others missing
   - **MISSING**: no code evidence found

### 2. Task Audit Protocol

For EACH task marked \`[x]\` in the story:

1. Read the task description
2. Search for code that fulfills the task
3. Verify tests exist for the task
4. Check:
   - Task done + code exists + tests pass = OK
   - Task done + code exists + no tests = MEDIUM
   - Task done + no code evidence = **CRITICAL**

### 3. Code Quality Checklist

#### Security
- [ ] All user inputs validated and sanitized
- [ ] No SQL injection vectors (parameterized queries)
- [ ] No command injection (no \`eval\`, no unescaped shell commands)
- [ ] No XSS vectors (output encoding)
- [ ] Authentication on protected routes
- [ ] Authorization checks (user can only access own data)
- [ ] No hardcoded secrets or API keys
- [ ] HTTPS enforced for sensitive data

#### Performance
- [ ] No N+1 query patterns
- [ ] Appropriate database indexes
- [ ] No unnecessary data fetching (select only needed fields)
- [ ] Caching where appropriate
- [ ] No blocking operations in hot paths
- [ ] Pagination for list endpoints

#### Reliability
- [ ] Error handling on all external calls (DB, API, filesystem)
- [ ] Graceful degradation on failure
- [ ] No swallowed exceptions (catch without logging/handling)
- [ ] Null/undefined checks on external data
- [ ] Timeout handling on network requests
- [ ] Retry logic where appropriate

#### Test Quality
- [ ] Real assertions (not \`expect(true).toBe(true)\`)
- [ ] Edge cases tested (empty, null, boundary values)
- [ ] Error paths tested (not just happy path)
- [ ] Tests are independent (no shared mutable state)
- [ ] Test descriptions match what they test
- [ ] No hardcoded test data that masks bugs

## Minimum Findings Floor

**3 findings minimum.** If after thorough review you have fewer than 3:

Re-examine these areas:
1. **Edge cases**: What happens with empty inputs? Maximum values? Concurrent access?
2. **Architecture violations**: Does the code follow the patterns established in project-context?
3. **Test gaps**: Are there untested code paths? Missing error scenario tests?
4. **Error handling**: What happens when external services fail? Network timeout? Invalid data?
5. **Security surface**: Any input that reaches the database without validation?

## Fix vs Defer Decision

### Fix Immediately (this review cycle)
- CRITICAL findings — always
- HIGH findings where fix is straightforward (< 30 min)
- Security vulnerabilities

### Defer to Dev (add [AI-Review] items)
- HIGH findings requiring significant refactoring
- Findings that need user input or architectural decisions
- Issues that might break other stories if fixed now

### Format for Deferred Items
\`\`\`
[AI-Review][HIGH] Missing input validation on email field [src/auth/register.ts:42]
[AI-Review][CRITICAL] Task 3 marked done but no test exists [src/api/users.test.ts]
\`\`\`
`;

// Fallback CSV data (used when data/ directory not available)
const DOMAIN_COMPLEXITY_CSV = `domain,signals,complexity,key_concerns,required_knowledge,suggested_workflow,web_searches,special_sections
healthcare,"medical,diagnostic,clinical,FDA,patient,treatment,HIPAA,therapy,pharma,drug",high,"FDA approval;Clinical validation;HIPAA compliance;Patient safety;Medical device classification;Liability","Regulatory pathways;Clinical trial design;Medical standards;Data privacy;Integration requirements","domain-research","FDA software medical device guidance {date};HIPAA compliance software requirements;Medical software standards {date};Clinical validation software","clinical_requirements;regulatory_pathway;validation_methodology;safety_measures"
fintech,"payment,banking,trading,investment,crypto,wallet,transaction,KYC,AML,funds,fintech",high,"Regional compliance;Security standards;Audit requirements;Fraud prevention;Data protection","KYC/AML requirements;PCI DSS;Open banking;Regional laws (US/EU/APAC);Crypto regulations","domain-research","fintech regulations {date};payment processing compliance {date};open banking API standards;cryptocurrency regulations {date}","compliance_matrix;security_architecture;audit_requirements;fraud_prevention"
govtech,"government,federal,civic,public sector,citizen,municipal,voting",high,"Procurement rules;Security clearance;Accessibility (508);FedRAMP;Privacy;Transparency","Government procurement;Security frameworks;Accessibility standards;Privacy laws;Open data requirements","domain-research","government software procurement {date};FedRAMP compliance requirements;section 508 accessibility;government security standards","procurement_compliance;security_clearance;accessibility_standards;transparency_requirements"
edtech,"education,learning,student,teacher,curriculum,assessment,K-12,university,LMS",medium,"Student privacy (COPPA/FERPA);Accessibility;Content moderation;Age verification;Curriculum standards","Educational privacy laws;Learning standards;Accessibility requirements;Content guidelines;Assessment validity","domain-research","educational software privacy {date};COPPA FERPA compliance;WCAG education requirements;learning management standards","privacy_compliance;content_guidelines;accessibility_features;curriculum_alignment"
general,"",low,"Standard requirements;Basic security;User experience;Performance","General software practices","continue","software development best practices {date}","standard_requirements"`;

const PROJECT_TYPES_CSV = `project_type,detection_signals,key_questions,required_sections,skip_sections,web_search_triggers,innovation_signals
api_backend,"API,REST,GraphQL,backend,service,endpoints","Endpoints needed?;Authentication method?;Data formats?;Rate limits?;Versioning?;SDK needed?","endpoint_specs;auth_model;data_schemas;error_codes;rate_limits;api_docs","ux_ui;visual_design;user_journeys","framework best practices;OpenAPI standards","API composition;New protocol"
web_app,"website,webapp,browser,SPA,PWA","SPA or MPA?;Browser support?;SEO needed?;Real-time?;Accessibility?","browser_matrix;responsive_design;performance_targets;seo_strategy;accessibility_level","native_features;cli_commands","web standards;WCAG guidelines","New interaction;WebAssembly use"
mobile_app,"iOS,Android,app,mobile,iPhone,iPad","Native or cross-platform?;Offline needed?;Push notifications?;Device features?;Store compliance?","platform_reqs;device_permissions;offline_mode;push_strategy;store_compliance","desktop_features;cli_commands","app store guidelines;platform requirements","Gesture innovation;AR/VR features"
saas_b2b,"SaaS,B2B,platform,dashboard,teams,enterprise","Multi-tenant?;Permission model?;Subscription tiers?;Integrations?;Compliance?","tenant_model;rbac_matrix;subscription_tiers;integration_list;compliance_reqs","cli_interface;mobile_first","compliance requirements;integration guides","Workflow automation;AI agents"
cli_tool,"CLI,command,terminal,bash,script","Interactive or scriptable?;Output formats?;Config method?;Shell completion?","command_structure;output_formats;config_schema;scripting_support","visual_design;ux_principles;touch_interactions","CLI design patterns;shell integration","Natural language CLI;AI commands"`;

const UX_PATTERNS = `# UX Screen Patterns Catalog

## Screen Types

### Form Screens
- **Login/Register**: email + password, social auth buttons, forgot link
- **Settings**: grouped sections, save/cancel, inline validation
- **Wizard/Multi-step**: progress indicator, back/next, step validation
- **Search + Filters**: search bar, filter sidebar/chips, results list

### List Screens
- **Data Table**: sortable headers, row actions, pagination, bulk select
- **Card Grid**: image + title + meta, responsive columns, load more
- **Feed/Timeline**: chronological, infinite scroll, activity items

### Detail Screens
- **Profile/Entity**: header (avatar, name, stats), tabbed content, actions
- **Article/Content**: title, meta, body, sidebar, related items

### Dashboard Screens
- **Analytics**: stat cards, charts, date range picker, export
- **Admin**: sidebar nav, content area, notification badge

### Utility Screens
- **Empty State**: illustration, message, CTA button
- **Error Page**: error code, message, back/home links
- **Loading**: skeleton screens, progress bar, spinner

## Layout Patterns

### Navigation
- **Top Nav**: logo left, nav center/right, avatar far right
- **Sidebar**: collapsible, icons + labels, active indicator, mobile hamburger
- **Tab Bar**: bottom tabs (mobile), top tabs (desktop), badge counts
- **Breadcrumb**: path hierarchy, current page non-linked

### Content Layout
- **Sidebar + Content**: 240-280px sidebar, fluid content, responsive collapse
- **Full Width**: max-width container (1200-1440px), centered
- **Split View**: list left, detail right (email pattern), resizable
- **Grid**: 12-column, responsive breakpoints (sm/md/lg/xl)

## Interaction Patterns

### Forms
- **Inline Validation**: validate on blur, show error below field, green checkmark on valid
- **Progressive Disclosure**: show fields based on previous answers
- **Autosave**: debounced save, "Saved" indicator, conflict resolution

### Data
- **Optimistic Updates**: update UI immediately, revert on error
- **Pagination**: page numbers for known total, infinite scroll for feeds
- **Search**: debounced input (300ms), loading indicator, clear button

### Feedback
- **Toast/Snackbar**: bottom-right, auto-dismiss (5s), action button, stacking
- **Modal/Dialog**: overlay, focus trap, escape to close, confirm/cancel
- **Inline Alerts**: contextual, dismissible, icon + message + action

## Responsive Breakpoints

| Name | Width | Typical |
|------|-------|---------|
| sm | < 640px | Mobile portrait |
| md | 640-1024px | Tablet / mobile landscape |
| lg | 1024-1440px | Desktop |
| xl | > 1440px | Large desktop |

## Accessibility Checklist

- [ ] All interactive elements keyboard-navigable (Tab, Enter, Escape)
- [ ] Focus indicator visible on all focusable elements
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast ratio ≥ 4.5:1 (text), ≥ 3:1 (large text)
- [ ] Form fields have associated labels
- [ ] Error messages linked to fields via aria-describedby
- [ ] Skip navigation link for screen readers
- [ ] Alt text on meaningful images
- [ ] Touch targets ≥ 44x44px on mobile
`;
