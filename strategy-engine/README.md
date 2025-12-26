# This is a Strategy Engine which is used to manage and execute trading strategies.

## How it works

1. MARKET MONITORING (Off-Chain)
   ↓
   Jupiter API → Get prices
   Check multiple DEXs
   Monitor portfolio
   
2. STRATEGY ANALYSIS (Off-Chain)
   ↓
   Arbitrage: Check spread
   Yield: Check APY
   Rebalance: Check allocation
   
3. DECISION MAKING (Rule-Based AI)
   ↓
   Check confidence > 60%
   Verify cooldown period
   Check daily loss limit
   Assess risk level
   
4. EXECUTION (On-Chain)
   ↓
   Get Jupiter quote
   Call your vault's execute_strategy
   Record results
   
5. TRACKING (On-Chain + Off-Chain)
   ↓
   Update StrategyExecution account
   Calculate performance
   Adjust future behavior
 

## Project Structure

strategy-engine/
├── src/
│   ├── core/
│   │   └── strategy-engine-core.ts     ← Core interfaces & base classes
│   ├── monitors/
│   │   └── market-monitors.ts          ← Price feeds & data
│   ├── strategies/
│   │   └── strategy-implementations.ts ← Arbitrage, Yield, Rebalancing
│   ├── agent/
│   │   └── ai-agent-executor.ts        ← AI agent with rules engine
│   ├── integration/
│   │   └── integration.ts              ← Usage examples
│   └── index.ts                        ← Main entry point
├── config/
│   ├── agents.json                     ← Agent configurations
│   └── strategies.json                 ← Strategy mappings
├── scripts/
│   ├── start-agent.ts                  ← Start agent script
│   ├── deploy-strategy.ts              ← Deploy new strategy
│   └── monitor.ts                      ← Monitoring dashboard
├── tests/
│   ├── strategies.test.ts
│   ├── agent.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
└── README.md
