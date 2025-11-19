#!/usr/bin/env bun

/**
 * Development Helper Script
 * Quick commands for common development tasks
 */

const commands = {
  'list-agents': listAgents,
  'create-sample-workflow': createSampleWorkflow,
  'validate-types': validateTypes,
  'project-stats': projectStats,
  'help': showHelp,
};

async function listAgents() {
  console.log('📋 Listing all registered agents...\n');
  const { agentRegistry } = await import('./src/index');
  const agents = await agentRegistry.listAgents();
  
  if (agents.length === 0) {
    console.log('No agents registered yet.');
    console.log('Run: bun run example.ts to create sample agents');
    return;
  }

  agents.forEach(agent => {
    console.log(`${agent.status === 'published' ? '✅' : '📝'} ${agent.name}`);
    console.log(`   Ref: ${agent.ref}`);
    console.log(`   Category: ${agent.category}`);
    console.log(`   Price: ${agent.pricing.amount} ${agent.pricing.token}`);
    console.log(`   Status: ${agent.status}`);
    console.log('');
  });
}

async function createSampleWorkflow() {
  console.log('📝 Creating sample workflow template...\n');
  const { yamlParser } = await import('./src/index');
  const template = yamlParser.generateTemplate();
  
  console.log(template);
  console.log('\n✨ Copy this template and customize for your workflow!');
}

async function validateTypes() {
  console.log('🔍 Running TypeScript type check...\n');
  const proc = Bun.spawn(['bunx', 'tsc', '--noEmit'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  
  await proc.exited;
  console.log(proc.exitCode === 0 ? '\n✅ No type errors!' : '\n❌ Type errors found');
}

async function projectStats() {
  console.log('📊 Project Statistics\n');
  
  // Count files
  const tsFiles = await Bun.$`find src -name "*.ts" | wc -l`.text();
  const totalLines = await Bun.$`find src -name "*.ts" -exec wc -l {} + | tail -1 | awk '{print $1}'`.text();
  
  console.log(`TypeScript Files: ${tsFiles.trim()}`);
  console.log(`Total Lines: ${totalLines.trim()}`);
  
  // Module status
  console.log('\n📦 Module Status:');
  console.log('  ✅ Types (9 modules)');
  console.log('  ✅ Agent Registry');
  console.log('  ✅ Workflow System (3 services)');
  console.log('  ⚠️  Payment Layer (partial)');
  console.log('  ✅ Configuration');
  console.log('  ✅ Utilities');
  console.log('  ❌ Execution Engine (TODO)');
  console.log('  ❌ Trust & Reputation (TODO)');
  console.log('  ❌ Identity Service (TODO)');
  console.log('  ❌ Monitoring (TODO)');
  console.log('  ❌ Multi-Chain (TODO)');
  console.log('  ❌ API Layer (TODO)');
  
  // Dependencies
  const pkg = await Bun.file('package.json').json();
  const depCount = Object.keys(pkg.dependencies || {}).length;
  const devDepCount = Object.keys(pkg.devDependencies || {}).length;
  
  console.log('\n📦 Dependencies:');
  console.log(`  Production: ${depCount}`);
  console.log(`  Development: ${devDepCount}`);
}

function showHelp() {
  console.log(`
🛠️  Agentic Ecosystem Development Helper

Usage: bun dev.ts <command>

Commands:
  list-agents              List all registered agents
  create-sample-workflow   Generate YAML workflow template
  validate-types           Run TypeScript type checker
  project-stats           Show project statistics
  help                    Show this help message

Examples:
  bun dev.ts list-agents
  bun dev.ts create-sample-workflow > my-workflow.yaml
  bun dev.ts validate-types
  bun dev.ts project-stats

Other useful commands:
  bun run start           Run main application
  bun run example.ts      Run complete example
  bun run dev             Watch mode
  `);
}

// Main
const command = process.argv[2] || 'help';
const handler = commands[command as keyof typeof commands];

if (!handler) {
  console.error(`❌ Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}

// Execute handler
try {
  const result = handler();
  if (result instanceof Promise) {
    result.catch((err: Error) => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
  }
} catch (err) {
  console.error('❌ Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}
