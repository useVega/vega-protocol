# Agentic Ecosystem - Project Structure

```
agentic-eco/
│
├── 📄 index.ts                      # Root entry point
├── 📄 package.json                  # Dependencies and scripts
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📘 README.md                     # Project overview
├── 📘 DEVELOPMENT.md                # Development status and roadmap
├── 📘 PROJECT_STRUCTURE.md          # This file
├── 📝 example.ts                    # Complete usage example
│
└── 📁 src/                          # Source code
    │
    ├── 📄 index.ts                  # Main application entry
    ├── 📄 main.ts                   # Central exports
    │
    ├── 📁 types/                    # ✅ Type Definitions (9 modules)
    │   ├── chain.types.ts           # Blockchain and token types
    │   ├── agent.types.ts           # Agent definitions and schemas
    │   ├── workflow.types.ts        # Workflow specifications
    │   ├── execution.types.ts       # Runtime execution state
    │   ├── payment.types.ts         # Payment events and x402
    │   ├── trust.types.ts           # Identity, reputation (ERC-8004)
    │   ├── identity.types.ts        # User and developer profiles
    │   ├── monitoring.types.ts      # Metrics and audit logs
    │   ├── errors.types.ts          # Custom error classes
    │   └── index.ts                 # Central type exports
    │
    ├── 📁 registry/                 # ✅ Agent Registry Module
    │   ├── agent-registry.service.ts    # CRUD operations
    │   └── index.ts                     # Module exports
    │
    ├── 📁 workflow/                 # ✅ Workflow System
    │   ├── yaml-parser.service.ts       # YAML DSL → WorkflowSpec
    │   ├── workflow-validator.service.ts # Graph & agent validation
    │   ├── workflow-scheduler.service.ts # Queue & budget management
    │   └── index.ts                     # Module exports
    │
    ├── 📁 payment/                  # ⚠️ Payment Layer (Partial)
    │   ├── budget-manager.service.ts    # ✅ Budget operations
    │   ├── payment-engine.service.ts    # ❌ TODO: x402 integration
    │   ├── settlement.service.ts        # ❌ TODO: On-chain settlement
    │   └── index.ts                     # Module exports
    │
    ├── 📁 execution/                # ❌ Execution Engine (TODO)
    │   ├── runtime-orchestrator.ts      # Workflow execution
    │   ├── node-executor.ts             # Individual node execution
    │   ├── agent-caller.service.ts      # HTTP & native agent calls
    │   └── index.ts                     # Module exports
    │
    ├── 📁 trust/                    # ❌ Trust & Reputation (TODO)
    │   ├── identity-registry.service.ts # ERC-8004 AgentID
    │   ├── reputation.service.ts        # Scoring and feedback
    │   ├── validation.service.ts        # Attestation records
    │   └── index.ts                     # Module exports
    │
    ├── 📁 identity/                 # ❌ Identity & Wallet (TODO)
    │   ├── user.service.ts              # User profile management
    │   ├── developer.service.ts         # Developer accounts
    │   ├── wallet-mapping.service.ts    # Multi-wallet support
    │   └── index.ts                     # Module exports
    │
    ├── 📁 monitoring/               # ❌ Monitoring & Logging (TODO)
    │   ├── audit-log.service.ts         # Audit trail
    │   ├── metrics.service.ts           # System metrics
    │   ├── run-history.service.ts       # Execution history
    │   └── index.ts                     # Module exports
    │
    ├── 📁 multichain/               # ❌ Multi-Chain Layer (TODO)
    │   ├── evm-adapter.ts               # EVM chain support
    │   ├── solana-adapter.ts            # Solana support
    │   ├── settlement-layer.ts          # Cross-chain settlement
    │   └── index.ts                     # Module exports
    │
    ├── 📁 api/                      # ❌ API Layer (TODO)
    │   ├── server.ts                    # Hono HTTP server
    │   ├── routes/
    │   │   ├── agents.routes.ts         # Agent endpoints
    │   │   ├── workflows.routes.ts      # Workflow endpoints
    │   │   └── runs.routes.ts           # Run management
    │   └── index.ts                     # API exports
    │
    ├── 📁 config/                   # ✅ Configuration
    │   ├── chains.config.ts             # Chain definitions
    │   ├── tokens.config.ts             # Token configurations
    │   ├── system.config.ts             # Platform settings
    │   └── index.ts                     # Config exports
    │
    └── 📁 utils/                    # ✅ Utilities
        ├── logger.ts                    # Colored logging
        ├── template-resolver.ts         # {{node.output}} resolver
        ├── bignumber.ts                 # String-based math
        └── index.ts                     # Utility exports
```

## Module Status Legend

- ✅ **Fully Implemented** - Production ready
- ⚠️ **Partially Implemented** - Core features done, advanced features pending
- ❌ **Not Implemented** - Planned but not started

## File Count

```
Total TypeScript files: 28
Total Modules: 11
Implemented: 5 modules (45%)
Remaining: 6 modules (55%)
```

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                        │
│                         (index.ts, API)                         │
└────────────────┬───────────────────────────┬────────────────────┘
                 │                           │
    ┌────────────▼──────────┐   ┌───────────▼────────────┐
    │   Workflow System     │   │   Agent Registry      │
    │   ├─ Parser          │   │   └─ CRUD Operations  │
    │   ├─ Validator       │   └────────────────────────┘
    │   └─ Scheduler       │                │
    └───────┬───────────────┘                │
            │                                │
    ┌───────▼──────────┐            ┌───────▼──────────┐
    │  Execution Engine│            │  Trust Layer     │
    │  ├─ Orchestrator │            │  ├─ Identity     │
    │  ├─ Node Exec    │            │  ├─ Reputation   │
    │  └─ Agent Caller │            │  └─ Validation   │
    └───────┬───────────┘            └───────┬──────────┘
            │                                │
    ┌───────▼──────────┐            ┌───────▼──────────┐
    │  Payment Layer   │            │  Identity Service│
    │  ├─ Budget Mgr   │            │  ├─ Users        │
    │  ├─ x402 Engine  │            │  ├─ Developers   │
    │  └─ Settlement   │            │  └─ Wallets      │
    └───────┬───────────┘            └──────────────────┘
            │
    ┌───────▼──────────────────────┐
    │   Multi-Chain Abstraction    │
    │   ├─ EVM Adapter             │
    │   ├─ Solana Adapter          │
    │   └─ Settlement Layer        │
    └──────────────────────────────┘
            │
    ┌───────▼──────────────────────┐
    │      Monitoring Layer        │
    │   ├─ Audit Logs             │
    │   ├─ Metrics                │
    │   └─ Run History            │
    └──────────────────────────────┘
```

## Data Flow

### Agent Registration Flow
```
Developer → Agent Registry → Validation → Storage → Publish
                    ↓
            Trust Layer (Optional AgentID minting)
```

### Workflow Execution Flow
```
User → YAML Parser → Validator → Scheduler → Queue
                         ↓            ↓
                  Agent Registry   Budget Manager
                         ↓            ↓
                  [Execution Engine (TODO)]
                         ↓
                  Agent Caller → HTTP/Native Agents
                         ↓
                  Payment Engine → Revenue Split → Settlement
                         ↓
                  Monitoring → Audit Logs
```

## Key Interfaces

### Agent Registry
- `createAgent()` - Register new agent
- `publishAgent()` - Make agent available
- `listAgents()` - Filter and discover
- `getAgent()` - Fetch agent details

### Workflow System
- `parse()` - YAML → WorkflowSpec
- `validate()` - Check graph validity
- `scheduleRun()` - Queue workflow
- `getNextRun()` - Dequeue for execution

### Payment System
- `reserveBudget()` - Lock user funds
- `releaseBudget()` - Refund unused
- `processPayment()` - x402 transfer (TODO)
- `settleBudget()` - Finalize

### Execution Engine (TODO)
- `executeRun()` - Run workflow
- `executeNode()` - Run single node
- `callAgent()` - Invoke agent endpoint
- `handleError()` - Retry logic

## Quick Navigation

- **Start Here**: `example.ts` - Complete usage example
- **Main Entry**: `src/index.ts` - Application initialization
- **Type Definitions**: `src/types/` - All interfaces
- **Core Logic**: `src/{registry,workflow,payment}/` - Business logic
- **Configuration**: `src/config/` - Settings
- **Development Guide**: `DEVELOPMENT.md` - Status and roadmap

## Next Steps for Developers

1. **To add new agent**: See `src/registry/agent-registry.service.ts`
2. **To create workflow**: See `example.ts` for YAML format
3. **To implement execution**: Start with `src/execution/` (create module)
4. **To add payment logic**: Extend `src/payment/payment-engine.service.ts`
5. **To add API**: Create `src/api/` with Hono routes

## Testing

```bash
# Run example
bun run example.ts

# Type check
bunx tsc --noEmit

# Watch mode
bun run dev
```
