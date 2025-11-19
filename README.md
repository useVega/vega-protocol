# Agentic Ecosystem

A multi-agent workflow platform enabling developers to create, publish, and monetize AI agents with built-in payment rails (x402) and trust infrastructure (ERC-8004).

## 🏗️ Architecture

The system is organized into 8 core modules:

### 1. **Agent Registry** (`src/registry/`)
- Agent definition management (CRUD operations)
- Agent validation and publishing
- Category-based discovery
- Chain/token compatibility filtering

### 2. **Workflow System** (`src/workflow/`)
- **YAML Parser**: Parse workflow DSL into executable specs
- **Validator**: Validate workflow graphs and agent references
- **Scheduler**: Queue and schedule workflow runs

### 3. **Payment Layer** (`src/payment/`)
- Budget reservation and management
- Micropayment support (x402 protocol)
- Revenue split (agent developer + platform fee)
- Multi-chain/token abstraction

### 4. **Execution Engine** (`src/execution/`) [Coming Soon]
- Runtime orchestration
- Node execution with dependency resolution
- Error handling and retries
- Agent invocation (HTTP and native)

### 5. **Trust & Reputation** (`src/trust/`) [Coming Soon]
- Agent identity (ERC-8004 AgentID)
- Reputation scoring
- Feedback collection
- Validation records

### 6. **Identity & Wallet** (`src/identity/`) [Coming Soon]
- User profile management
- Wallet mapping
- Developer payout configuration

### 7. **Monitoring & Logging** (`src/monitoring/`) [Coming Soon]
- Audit logs
- System metrics
- Performance tracking

### 8. **Multi-Chain Abstraction** (`src/multichain/`) [Coming Soon]
- Chain-specific adapters
- Token transfer abstraction
- Settlement layer

## 📁 Project Structure

```
agentic-eco/
├── src/
│   ├── types/              # Type definitions (modular)
│   │   ├── chain.types.ts
│   │   ├── agent.types.ts
│   │   ├── workflow.types.ts
│   │   ├── execution.types.ts
│   │   ├── payment.types.ts
│   │   ├── trust.types.ts
│   │   ├── identity.types.ts
│   │   ├── monitoring.types.ts
│   │   └── errors.types.ts
│   │
│   ├── registry/           # Agent Registry Module
│   │   ├── agent-registry.service.ts
│   │   └── index.ts
│   │
│   ├── workflow/           # Workflow Module
│   │   ├── yaml-parser.service.ts
│   │   ├── workflow-validator.service.ts
│   │   ├── workflow-scheduler.service.ts
│   │   └── index.ts
│   │
│   ├── payment/            # Payment Module
│   │   ├── budget-manager.service.ts
│   │   └── index.ts
│   │
│   ├── config/             # Configuration
│   │   ├── chains.config.ts
│   │   ├── tokens.config.ts
│   │   ├── system.config.ts
│   │   └── index.ts
│   │
│   ├── utils/              # Utilities
│   │   ├── logger.ts
│   │   ├── template-resolver.ts
│   │   ├── bignumber.ts
│   │   └── index.ts
│   │
│   ├── index.ts            # Main entry point
│   └── main.ts             # Central exports
│
├── index.ts                # Root entry
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Install Dependencies

```bash
bun install
```

### Run the Application

```bash
bun run dev
```

### Run Demo

```bash
bun run start
```

## 📝 Workflow YAML DSL

Example workflow definition:

```yaml
name: "Content Analysis Pipeline"
description: "Crawl, analyze, and summarize web content"
version: "1.0.0"
chain: "base"
token: "USDC"
maxBudget: "5.0"
entryNode: "crawler"
tags:
  - content
  - analysis

nodes:
  crawler:
    type: agent
    agent: web-crawler-v1
    name: "Fetch Content"
    inputs:
      url: "{{input.url}}"
    retry:
      maxAttempts: 3
      backoffMs: 1000
      
  analyzer:
    type: agent
    agent: sentiment-analyzer-v1
    name: "Analyze Sentiment"
    inputs:
      text: "{{crawler.output}}"
      
  summarizer:
    type: agent
    agent: text-summarizer-v1
    name: "Generate Summary"
    inputs:
      text: "{{crawler.output}}"
      maxLength: 200

edges:
  - from: crawler
    to: analyzer
  - from: crawler
    to: summarizer
```

## 🔧 Core Features

### Agent Registry
- ✅ Create and manage agent definitions
- ✅ Category-based filtering
- ✅ Chain/token compatibility
- ✅ Status management (draft, published, deprecated)

### Workflow System
- ✅ YAML DSL parser
- ✅ Graph validation (cycles, reachability)
- ✅ Agent reference validation
- ✅ Budget estimation
- ✅ Workflow scheduling and queuing

### Payment System
- ✅ Budget reservation
- ✅ Multi-token support
- ⏳ x402 micropayments (coming soon)
- ⏳ Automatic revenue split (coming soon)

### Execution Engine
- ⏳ Node execution with dependency resolution
- ⏳ Template variable resolution ({{node.output}})
- ⏳ Error handling and retries
- ⏳ HTTP and native agent invocation

## 🛠️ Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Blockchain**: Ethers.js (EVM), Solana Web3.js
- **HTTP Server**: Hono
- **YAML Parsing**: js-yaml
- **Validation**: Zod

## 🎯 Supported Chains

- Base (EVM)
- Arbitrum (EVM)
- Ethereum Mainnet (EVM)
- Solana

## 💰 Supported Tokens

- USDC (all chains)
- USDT (EVM chains)
- ETH (EVM chains)
- SOL (Solana)

## 📚 Next Steps

1. **Execution Engine**: Implement workflow runtime orchestrator
2. **Agent Invocation**: HTTP and native agent callers
3. **Payment Engine**: x402 micropayment integration
4. **Trust Layer**: ERC-8004 identity and reputation
5. **API Layer**: REST API for workflow management
6. **UI**: Web interface for agent marketplace and workflow builder

## 🤝 Contributing

This is an MVP implementation. Contributions are welcome!

## 📄 License

MIT
