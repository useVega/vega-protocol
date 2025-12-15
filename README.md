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
- **x402 Protocol Integration**: Standardized payment middleware extending x402ServerExecutor
- **Registry-Based Configuration**: Dynamic payment requirements loaded from AgentRegistry
- **Payment-Aware Client**: Automatic 402 detection and on-chain USDC settlement
- **Merchant Server Executor**: Production-ready payment verification and settlement
- **Budget Management**: Reservation and tracking across workflows
- **Multi-chain Support**: Base and Base Sepolia with USDC payments

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
│   │   ├── x402-middleware.ts          # x402 payment middleware
│   │   ├── agent-config-loader.ts      # Registry config loader
│   │   ├── payment-aware-client.ts     # Auto payment client
│   │   ├── merchant-server-executor.ts # Production executor
│   │   ├── budget-manager.service.ts   # Budget tracking
│   │   ├── x402-payment.service.ts     # Payment service
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
├── register-agents.ts      # Agent registration script
├── test-payment-workflow.ts # Payment testing
├── run-payment-enabled-workflow.ts # Payment executor
└── README.md
```

## 🚀 Getting Started

### Install Dependencies

```bash
bun install
```

### Environment Setup

Create a `.env` file with your configuration:

```bash
# Payment Configuration
PRIVATE_KEY=your_wallet_private_key
MERCHANT_WALLET=your_merchant_wallet_address
PAYMENT_NETWORK=base-sepolia  # or 'base' for mainnet
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
AUTO_PAYMENT=true

# Agent Configuration
PORT=3001
HOST=localhost
```

**Getting Test Tokens (Base Sepolia)**:
- ETH Faucet: https://www.alchemy.com/faucets/base-sepolia
- USDC Faucet: https://faucet.circle.com/

### Run the Application

```bash
bun run dev
```

### Register Agents

```bash
bun run register-agents.ts
```

### Test Payment Workflow

```bash
bun run test-payment-workflow.ts
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

## 💰 Payment System (x402 Protocol)

The platform implements the x402 payment protocol for seamless agent monetization with on-chain USDC settlements.

### Payment Architecture

```
Registry (Payment Config) 
  → Config Loader (Runtime Settings)
    → x402 Middleware (Payment Enforcement)
      → Agent Executor (Business Logic)
```

### Agent Payment Configuration

Agents configure payment requirements in the registry:

```typescript
const agent: AgentDefinition = {
  ref: 'echo-agent',
  name: 'Simple Echo Agent',
  pricing: {
    type: 'per-call',
    amount: '100',           // 100 USDC (in atomic units: 100,000,000)
    token: 'USDC',
    chain: 'base',
    requiresPayment: true,   // Enable payment enforcement
    paymentNetwork: 'base-sepolia', // or 'base' for mainnet
  },
  // ... other fields
};
```

### Agent Implementation with x402 Middleware

```typescript
import { loadAgentConfig } from './src/payment/agent-config-loader';
import { createX402Middleware } from './src/payment/x402-middleware';
import { registerAgents } from './register-agents';

// Agent executor with business logic only
class EchoAgentExecutor implements AgentExecutor {
  async execute(input: Message): Promise<Message> {
    // Pure business logic - no payment code needed
    return {
      kind: 'message',
      parts: [{ kind: 'text', text: `Echo: ${input.parts[0].text}` }]
    };
  }
}

// Initialize with registry-based config
async function initializeAgent() {
  await registerAgents();
  
  const config = await loadAgentConfig('echo-agent');
  const baseExecutor = new EchoAgentExecutor();
  
  // Wrap with x402 middleware if payment required
  const executor = config.requiresPayment
    ? createX402Middleware(baseExecutor, config.agent, {
        merchantWallet: process.env.MERCHANT_WALLET,
        network: process.env.PAYMENT_NETWORK,
      })
    : baseExecutor;

  return { executor, config };
}
```

### Client-Side Payment Handling

The `PaymentAwareClient` automatically detects 402 responses and processes payments:

```typescript
import { PaymentAwareClient } from './src/payment/payment-aware-client';
import { Wallet } from 'ethers';

// Create wallet
const wallet = new Wallet(process.env.PRIVATE_KEY);

// Create payment-aware client
const client = await PaymentAwareClient.fromCardUrl(
  'http://localhost:3001/.well-known/agent-card.json',
  {
    wallet,
    autoPayment: true,
    maxPaymentAmount: 1_000_000, // 1 USDC max
  }
);

// Send message - payment handled automatically
const response = await client.sendMessage({
  message: {
    kind: 'message',
    messageId: uuidv4(),
    role: 'user',
    parts: [{ kind: 'text', text: 'Hello!' }],
  },
});
```

### Payment Flow

1. **Client Request** → Agent receives message without payment
2. **402 Response** → Agent returns Payment Required with requirements
3. **Payment Signing** → Client signs payment authorization
4. **On-Chain Transfer** → Client executes USDC transfer on Base
5. **Transaction Confirmation** → Wait for block confirmation
6. **Retry with Proof** → Client retries with payment metadata
7. **Verification** → Middleware verifies payment details
8. **Execution** → Agent processes request and returns result

### Payment Requirements Format (x402)

```typescript
{
  scheme: 'exact',
  network: 'base-sepolia',
  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
  payTo: '0xMerchantWalletAddress',
  maxAmountRequired: '100000000', // 100 USDC in atomic units
  resource: '/echo-agent',
  description: 'Simple Echo Agent - Echoes messages',
  mimeType: 'application/json',
  maxTimeoutSeconds: 1200,
}
```

### Supported Networks

| Network       | Chain ID | USDC Address                                 |
|--------------|----------|---------------------------------------------|
| Base Mainnet | 8453     | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Base Sepolia | 84532    | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

### Testing Payments

```bash
# Set up environment
export PRIVATE_KEY="your_private_key"
export MERCHANT_WALLET="0xYourMerchantAddress"
export PAYMENT_NETWORK="base-sepolia"

# Register agents
bun run register-agents.ts

# Run payment workflow test
bun run test-payment-workflow.ts
```

**Example Output**:
```
💳 Payment required, processing...
   Amount: 0.000100 USDC
   To: 0xFcbeF27670a4b6F88905a7eec5F4AB2f4FFc0dD2
✅ Payment settled on-chain
📝 Transaction Hash: 0x166e1cf76756f16dd921a1dd6add1b3120d9e530f00155479a5d9cae57d0cd09
🔗 View on BaseScan: https://sepolia.basescan.org/tx/0x166e...
```

### Payment-Enabled Workflows

Execute multi-agent workflows with automatic payment orchestration:

```typescript
import { PaymentEnabledWorkflowExecutor } from './run-payment-enabled-workflow';

const executor = new PaymentEnabledWorkflowExecutor({
  network: 'base-sepolia',
  privateKey: process.env.PRIVATE_KEY,
  autoPayment: true,
});

const result = await executor.executeWorkflow(
  './workflows/registry-text-pipeline.yaml',
  { message: 'Hello from payment-enabled workflow!' }
);

// Automatically handles payments for each agent in the workflow
// Tracks total cost and displays transaction hashes
```


## 🔧 Core Features

### Agent Registry
- ✅ Create and manage agent definitions
- ✅ Category-based filtering
- ✅ Chain/token compatibility
- ✅ Status management (draft, published, deprecated)
- ✅ Payment configuration (requiresPayment, paymentNetwork)

### Workflow System
- ✅ YAML DSL parser
- ✅ Graph validation (cycles, reachability)
- ✅ Agent reference validation
- ✅ Budget estimation
- ✅ Workflow scheduling and queuing
- ✅ Payment-aware execution with automatic settlement

### Payment System (x402 Protocol)
- ✅ Registry-based payment configuration
- ✅ x402 middleware for agents (extends x402ServerExecutor)
- ✅ Automatic payment detection and processing (PaymentAwareClient)
- ✅ On-chain USDC transfers on Base Sepolia
- ✅ Payment verification with signed payloads
- ✅ Transaction tracking with BaseScan links
- ✅ 402 Payment Required responses
- ✅ Multi-agent workflow payment orchestration
- ⏳ On-chain payment verification
- ⏳ Payment facilitator integration
- ⏳ Automatic revenue split

### Execution Engine
- ✅ Registry-based workflow execution
- ✅ Payment-enabled workflow executor
- ✅ Template variable resolution ({{node.output}})
- ✅ Error handling and retries
- ✅ HTTP agent invocation
- ⏳ Native agent invocation

## 🛠️ Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Blockchain**: Ethers.js v6 (EVM), Solana Web3.js
- **Payment Protocol**: x402 (a2a-x402 library)
- **A2A Protocol**: @a2a-js/sdk v0.3.0
- **HTTP Server**: Express, Hono
- **YAML Parsing**: yaml
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

1. ✅ ~~Execution Engine~~: Workflow runtime orchestrator implemented
2. ✅ ~~Agent Invocation~~: HTTP agent callers implemented
3. ✅ ~~Payment Engine~~: x402 protocol integration complete
4. 🚧 **Text Transformer Payment**: Apply x402 middleware to text-transformer agent
5. 🚧 **On-Chain Verification**: Implement transaction verification in middleware
6. **Trust Layer**: ERC-8004 identity and reputation system
7. **API Layer**: REST API for workflow management
8. **UI**: Web interface for agent marketplace and workflow builder
9. **Production Deployment**: Base mainnet with real USDC payments
10. **Payment Facilitator**: Integrate x402 facilitator for payment routing

## 🤖 Registering Your Agent

### Overview

Agents must be registered in the AgentRegistry before they can be used in workflows. Registration defines your agent's metadata, pricing, capabilities, and payment requirements.

### Quick Start - Register an Agent

**Method 1: Using the Registration Script**

1. Add your agent to `register-agents.ts`:

```typescript
const agents: Partial<AgentDefinition>[] = [
  {
    ref: 'my-agent',                    // Unique identifier
    name: 'My Custom Agent',
    version: '1.0.0',
    description: 'What your agent does',
    category: 'transformation',         // See categories below
    endpointType: 'http',
    endpointUrl: 'http://localhost:3003',
    ownerWallet: '0xYourWalletAddress',
    
    // Pricing configuration
    pricing: {
      type: 'per-call',
      amount: '100',                    // In atomic units (100 = 0.0001 USDC)
      token: 'USDC',
      chain: 'base',
      requiresPayment: true,            // Enable x402 payments
      paymentNetwork: 'base-sepolia',   // or 'base' for mainnet
    },
    
    supportedChains: ['base'],
    supportedTokens: ['USDC'],
    status: 'published',
    ownerId: 'your-developer-id',
    
    // Input schema (JSON Schema)
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Input text' },
        option: { type: 'string', enum: ['option1', 'option2'] },
      },
      required: ['text'],
    },
    
    // Output schema (JSON Schema)
    outputSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
    
    tags: ['text', 'processing', 'custom'],
  },
];
```

2. Run registration:
```bash
bun run register-agents.ts
```

**Method 2: Programmatic Registration**

```typescript
import { AgentRegistry } from './src/registry/agent-registry.service';

const registry = new AgentRegistry();

// Create agent
const agent = await registry.createAgent({
  ref: 'my-agent',
  name: 'My Custom Agent',
  // ... other fields
});

// Publish agent (makes it available in workflows)
await registry.publishAgent(agent.ref);
```

### Agent Definition Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ref` | string | ✅ | Unique identifier (e.g., 'text-summarizer-v1') |
| `name` | string | ✅ | Human-readable name |
| `version` | string | ✅ | Semantic version (e.g., '1.0.0') |
| `description` | string | ✅ | What the agent does |
| `category` | AgentCategory | ✅ | Agent category (see below) |
| `endpointType` | 'http' \| 'native' | ✅ | How to invoke the agent |
| `endpointUrl` | string | ✅* | HTTP endpoint URL (*required for http type) |
| `ownerWallet` | string | ✅ | Ethereum address for payments |
| `ownerId` | string | ✅ | Developer/organization ID |
| `pricing` | PricingModel | ✅ | Pricing configuration |
| `inputSchema` | JSON Schema | ✅ | Input validation schema |
| `outputSchema` | JSON Schema | ✅ | Output format schema |
| `supportedChains` | ChainType[] | ✅ | Supported blockchains |
| `supportedTokens` | TokenSymbol[] | ✅ | Accepted payment tokens |
| `tags` | string[] | ✅ | Searchable tags |
| `status` | AgentStatus | Auto | 'draft', 'published', 'deprecated', 'suspended' |
| `agentIdOnChain` | string | ❌ | ERC-8004 on-chain identity |

### Agent Categories

Available categories for agent classification:

- `data-collection` - Web scrapers, API fetchers, data miners
- `analysis` - Sentiment analysis, data analytics, insights
- `transformation` - Text processing, format conversion, data mapping
- `summarization` - Content summarization, report generation
- `notification` - Alerts, emails, webhooks
- `storage` - Data persistence, file upload, archiving
- `ml-inference` - AI/ML model inference, predictions
- `validation` - Data validation, verification, compliance checks
- `other` - General purpose or uncategorized agents

### Pricing Configuration

```typescript
pricing: {
  type: 'per-call' | 'per-unit' | 'subscription',
  amount: string,              // Atomic units (e.g., '100' = 0.0001 USDC)
  token: 'USDC' | 'USDT' | 'ETH' | 'SOL',
  chain: 'base' | 'arbitrum' | 'ethereum' | 'solana',
  unit?: string,               // For per-unit: 'per-1000-tokens', 'per-MB'
  requiresPayment?: boolean,   // Enable x402 payment enforcement
  paymentNetwork?: string,     // 'base' or 'base-sepolia'
}
```

**USDC Atomic Units:**
- 1 USDC = 1,000,000 atomic units
- 0.001 USDC = 1,000 atomic units
- 0.0001 USDC = 100 atomic units

### Input/Output Schemas

Use [JSON Schema](https://json-schema.org/) format:

```typescript
inputSchema: {
  type: 'object',
  properties: {
    text: { 
      type: 'string', 
      description: 'Text to process',
      minLength: 1,
      maxLength: 10000,
    },
    language: { 
      type: 'string', 
      enum: ['en', 'es', 'fr'],
      default: 'en',
    },
    options: {
      type: 'object',
      properties: {
        verbose: { type: 'boolean' },
        timeout: { type: 'number' },
      },
    },
  },
  required: ['text'],
}
```

### Agent Lifecycle

```
1. Create (draft status)
   ↓
2. Test & Validate
   ↓
3. Publish (available in workflows)
   ↓
4. Update (version changes)
   ↓
5. Deprecate (mark old versions)
   ↓
6. Suspend (temporarily disable)
```

### Registry Operations

```typescript
// List all published agents
const agents = await registry.listAgents({ status: 'published' });

// Find agents by category
const analyzers = await registry.listAgents({ category: 'analysis' });

// Find agents by chain
const baseAgents = await registry.listAgents({ chain: 'base' });

// Search by tags
const textAgents = await registry.listAgents({ tags: ['text', 'nlp'] });

// Get specific agent
const agent = await registry.getAgent('my-agent');

// Update agent
await registry.updateAgent('my-agent', {
  version: '1.1.0',
  description: 'Updated description',
});

// Publish agent
await registry.publishAgent('my-agent');

// Deprecate agent
await registry.deprecateAgent('my-agent');
```

### Best Practices

1. **Unique References**: Use descriptive refs like `sentiment-analyzer-v1` instead of `agent1`
2. **Semantic Versioning**: Follow semver (major.minor.patch)
3. **Clear Descriptions**: Help users understand what your agent does
4. **Accurate Schemas**: Validate all inputs and document outputs
5. **Reasonable Pricing**: Start low, adjust based on usage and costs
6. **Proper Categories**: Choose the most appropriate category
7. **Useful Tags**: Add searchable tags for discovery
8. **Test Before Publishing**: Verify your agent works before publishing
9. **Update Gracefully**: Create new versions, deprecate old ones
10. **Document Changes**: Keep changelog in description or separate docs

### Testing Your Registration

```bash
# 1. Register your agent
bun run register-agents.ts

# 2. Verify it's registered
bun -e "
import { registry } from './register-agents';
const agent = await registry.getAgent('my-agent');
console.log(agent);
"

# 3. Test in a workflow
# Add your agent ref to a YAML workflow and execute
```

### Example: Full Agent Registration Flow

```typescript
// 1. Define agent in register-agents.ts
{
  ref: 'sentiment-analyzer',
  name: 'Sentiment Analysis Agent',
  version: '1.0.0',
  description: 'Analyzes text sentiment using ML models',
  category: 'analysis',
  endpointType: 'http',
  endpointUrl: 'http://localhost:3005',
  ownerWallet: process.env.OWNER_WALLET,
  pricing: {
    type: 'per-call',
    amount: '200',
    token: 'USDC',
    chain: 'base',
    requiresPayment: true,
    paymentNetwork: 'base-sepolia',
  },
  supportedChains: ['base'],
  supportedTokens: ['USDC'],
  status: 'published',
  ownerId: 'my-company',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to analyze' },
    },
    required: ['text'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
      score: { type: 'number', minimum: 0, maximum: 1 },
      confidence: { type: 'number' },
    },
  },
  tags: ['sentiment', 'nlp', 'ml', 'analysis'],
}

// 2. Register
bun run register-agents.ts

// 3. Use in workflow (YAML)
nodes:
  - id: analyze
    ref: sentiment-analyzer
    name: Analyze Sentiment
    inputs:
      text: "{{inputs.review_text}}"
```

## 📦 Example Agents

### Simple Echo Agent (Port 3001)
- **Pricing**: 100 USDC per call
- **Capability**: Echoes back messages with metadata
- **Payment**: x402 middleware enabled
- **Status**: ✅ Production-ready
- **Start**: `bun run agents/simple-echo-agent.ts`

### Text Transformer Agent (Port 3002)
- **Pricing**: 150 USDC per call
- **Capabilities**: uppercase, lowercase, reverse, wordcount, capitalize, titlecase
- **Payment**: ⚠️ Configured but middleware not yet applied
- **Status**: 🚧 In progress
- **Start**: `bun run agents/text-transformer-agent.ts`

## 🔗 Useful Links

- **x402 Protocol**: https://github.com/a2a-protocol/x402
- **A2A SDK**: https://github.com/a2a-protocol/a2a-js
- **Base Sepolia Explorer**: https://sepolia.basescan.org
- **Base Sepolia Faucet**: https://www.alchemy.com/faucets/base-sepolia
- **USDC Faucet**: https://faucet.circle.com/
- **Base Documentation**: https://docs.base.org

## 🤝 Contributing

This is an MVP implementation. Contributions are welcome!

## 📄 License

MIT
