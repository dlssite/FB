# Upgrade Proposal: Dynamic Tenant-Specific Database Routing

## 1. Problem Statement
As the Flameborn fleet grows, a single monolithic database becomes a performance bottleneck and a security risk (data isolation). Large communities ("VIP Tenants") often require their own dedicated database servers for regulatory compliance, data ownership, or raw performance.

## 2. Proposed Architecture: The "Database Manager"
Instead of a single global `PrismaClient`, the bot will move to a **Dynamic Connection Registry**.

### Key Components:
- **`DatabaseManager.ts`**: A service that manages a map of `TenantID -> PrismaClient`.
- **LRU Cache Strategy**: To prevent memory leaks (OOM), the manager will only keep the 50 most active connections open. Idle connections will be gracefully closed after 30 minutes.
- **Context-Aware Routing**: The `AsyncLocalStorage` in `src/utils/context.ts` will store the specific database client for the current request.

### Implementation Flow:
1. **Handshake**: Command starts -> Get `tenantId`.
2. **Resolution**: `DatabaseManager` checks if the tenant has an `externalDbUrl`.
3. **Acquisition**:
    - If `null`: Use the **Shared Prisma Client**.
    - If `exists`: Use (or create) the **Private Prisma Client**.
4. **Execution**: Repository uses `context.getDbClient()` instead of `import { prisma }`.

## 3. Implementation Steps (Roadmap)

### Phase A: Infrastructure Refactor
- [ ] **Repository Decoupling**: Update all repository classes to accept a `PrismaClient` in their constructor or retrieve it from the storage context.
- [ ] **DatabaseManager Creation**: Implement the connection pooler with an LRU cache (using `lru-cache` or a custom timer logic).

### Phase B: Schema Evolution
- [ ] **Mothership Sync**: Add `dbUrl` and `dbProvider` fields to the `tenants` model in `schema.prisma`.
- [ ] **Credential Encryption**: Ensure `dbUrl` strings are encrypted at rest on the Mothership.

### Phase C: Fleet Migration Engine
- [ ] **Schema Parity**: Build a script that iterates through all `externalDbUrl` entries and runs `prisma db push` to ensure all VIP databases are up-to-date with the main bot's schema.

## 4. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| **Memory Leak (OOM)** | Strict LRU eviction policy; `prisma.$disconnect()` on eviction. |
| **Connection Limits** | Set `connection_limit=5` (low) for external tenant URLs. |
| **Security (SQLi)** | Never allow user-input to form the DB URL; only allow Admin/Mothership set values. |
| **Migration Failure** | Implement a "Drift Detection" check on startup for every tenant DB. |

## 5. Senior Summary
This upgrade moves the Flameborn Ecosystem from a "Standard Bot" to a "Cloud-Native SaaS" architecture. It ensures that the bot can scale horizontally and offer data sovereignty to high-value clients.

---
**Status**: PROPOSED (Waiting for Phase 6)
**Complexity**: High
**Priority**: Medium
