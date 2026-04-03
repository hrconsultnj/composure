# Composure — Commercial License Agreement

**Version 1.0 — Effective March 21, 2026**

Required Notice: Copyright (c) 2026 Helder Rodrigues (https://github.com/hrconsultnj)

---

## 1. Definitions

- **"Licensor"** — Helder Rodrigues, the creator and copyright holder of Composure.
- **"Plugin"** — The Composure plugin for Claude Code, including all hooks, skills, MCP servers, and documentation distributed via the public repository.
- **"Pro Patterns"** — The proprietary architecture reference documents distributed via the private repository (`composure-pro`), including but not limited to: data patterns, auth models, RLS policies, migration patterns, and role hierarchy documentation.
- **"Licensee"** — The individual who purchased a commercial license, identified by their GitHub username.
- **"Major Version"** — A release designated by the Licensor as a new major version (e.g., V1, V2, V3). The Licensor determines what constitutes a major version at their sole discretion.

---

## 2. What This License Covers

### 2.1 Community Tier (Free — No Purchase Required)

The Plugin is available under the [PolyForm Noncommercial License 1.0.0](LICENSE) at no cost. This includes:

- All hooks (no-bandaids, decomposition check, architecture trigger, graph update)
- Code review graph MCP server
- All skills (`/review-pr`, `/review`, `/audit`, `/backlog`, `/build-graph`, `/initialize`)
- Universal reference documents (query key conventions, component patterns, SSR hydration, decomposition, route groups, tabs/views, TanStack Query guides, hook patterns, icon patterns, bottom sheet sizing, custom UI components)
- Conceptual architecture guidance in SKILL.md (7-phase workflow, decision trees, anti-patterns, size limits)

**Permitted use:** Personal projects, hobby work, learning, academic research, nonprofit organizations, government institutions — any noncommercial purpose as defined by the PolyForm Noncommercial License.

**Commercial use of the free tier requires purchasing a Pro license.**

### 2.2 Pro License ($39 USD — Per GitHub Username, Per Major Version)

A Pro license grants the Licensee:

1. **Commercial use** of the Plugin in freelance, agency, or corporate work.
2. **Access to Pro Patterns** via GitHub collaborator access to `composure-pro`, for the purchased major version.
3. **All updates within the purchased major version** at no additional cost.

---

## 3. License Grant

Subject to the terms of this agreement, the Licensor grants the Licensee a **non-exclusive, non-transferable, non-sublicensable, worldwide license** to:

1. Use the Plugin and Pro Patterns in commercial projects.
2. Incorporate architectural concepts from the Pro Patterns into the Licensee's own projects.
3. Receive updates to the Pro Patterns within the purchased major version.

---

## 4. Restrictions

The Licensee **may not**:

1. **Redistribute** the Pro Patterns, in whole or in part, to any person or entity who has not purchased their own license.
2. **Share GitHub access** — the `composure-pro` collaborator access is tied to the Licensee's GitHub username and may not be shared, transferred, or used by others.
3. **Publish, post, or otherwise make publicly available** any content from the Pro Patterns, including but not limited to: copying into public repositories, blog posts, documentation sites, AI training datasets, or knowledge bases accessible to unlicensed individuals.
4. **Create derivative works** that compete with Composure or the Pro Patterns (e.g., repackaging the patterns as a competing plugin, course, or paid template).
5. **Circumvent access controls** including but not limited to: forking the private repository to a public location, cloning and re-hosting, or distributing via any other mechanism.

---

## 5. Delivery & Access

1. Upon verified payment, the Licensor will add the Licensee's GitHub username as a collaborator on the `composure-pro` repository within 48 hours.
2. The Licensee can then populate the Pro Patterns by running `git submodule update --init` in their Composure installation.
3. Access remains active as long as the license is in good standing.

---

## 6. Payment & Refund Policy

1. **Payment** is processed through the Licensor's designated payment platform (currently Buy Me a Coffee). The Licensor is not the merchant of record for payment processing.
2. **This is a digital product.** Due to the nature of immediate-access digital goods:
   - The Licensee acknowledges that GitHub collaborator access is granted promptly after purchase.
   - The Licensee acknowledges that the Pro Patterns are documentation and architectural reference material — once accessed, the knowledge cannot be "returned."
   - **No refunds** will be issued after GitHub collaborator access has been granted.
   - If access has not yet been granted (within the 48-hour delivery window), the Licensee may request a full refund.
3. **Chargebacks** — If a Licensee initiates a payment dispute (chargeback) after receiving access:
   - GitHub collaborator access will be revoked immediately.
   - The license is terminated.
   - The Licensee's GitHub username may be recorded to prevent future purchases.

---

## 7. Version Upgrades

1. Each license purchase covers **one major version** of the Pro Patterns.
2. When a new major version is released, existing Licensees:
   - **Retain permanent access** to the major version they purchased.
   - May upgrade to the new major version at **50% off** the then-current price ($19 USD at current pricing) as a valued customer discount.
3. The Licensor will provide reasonable advance notice before releasing a new major version.

---

## 8. Termination

This license terminates automatically if:

1. The Licensee violates any of the Restrictions in Section 4.
2. The Licensee initiates a chargeback after receiving access (Section 6.3).
3. The Licensee provides false identity information (e.g., a GitHub username belonging to someone else).

Upon termination:
- GitHub collaborator access is revoked.
- The Licensee must delete all copies of the Pro Patterns in their possession.
- The Licensee may continue to use the free Community tier under the PolyForm Noncommercial License.

---

## 9. No Warranty

The Plugin and Pro Patterns are provided **"as is"** without warranty of any kind, express or implied. The Licensor does not warrant that the patterns will be suitable for any particular project, framework version, or use case.

---

## 10. Limitation of Liability

The Licensor's total liability under this agreement shall not exceed the amount paid by the Licensee for the license. In no event shall the Licensor be liable for indirect, incidental, special, or consequential damages.

---

## 11. Governing Law

This agreement is governed by the laws of the State of New Jersey, United States, without regard to conflict of law principles.

---

## Summary Table

| | Community (Free) | Pro ($39) |
|---|---|---|
| Plugin core (hooks, graph MCP, skills) | Yes | Yes |
| Universal reference docs | Yes | Yes |
| Conceptual architecture (SKILL.md) | Yes | Yes |
| Commercial use | No | **Yes** |
| Pro Patterns (private submodule) | No | **Yes** |
| RLS & migration patterns | No | **Yes** |
| Updates within major version | Yes | **Yes** |
| License scope | Noncommercial only | Per GitHub user, per major version |

---

## Purchase

To purchase a Pro license, visit the Composure store page or contact:

Helder Rodrigues
hrconsultnj@gmail.com
https://github.com/hrconsultnj
