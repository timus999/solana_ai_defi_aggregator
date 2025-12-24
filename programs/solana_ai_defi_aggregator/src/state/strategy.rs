use anchor_lang::prelude::*;

#[account]
pub struct Strategy {
    pub creator: Pubkey,                // Strategy creator
    pub strategy_id: u64,               // Unique ID
    pub name: String,                   // Strategy name (max 50 chars)
    pub description: String,            // Description (max 200 chars)
    pub price: u64,                     // Price in USDC (lamports)
    pub is_active: bool,                // Can be purchased?
    pub total_purchases: u64,           // Times purchased
    pub total_executions: u64,          // Times executed
    pub total_profit: i64,              // Cumulative profit/loss
    pub success_rate: u16,              // Success rate (0-10000 = 0-100%)
    pub created_at: i64,                // Timestamp
    pub strategy_type: StrategyType,    // Type of strategy
    pub parameters: StrategyParameters, // Strategy config
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum StrategyType {
    Arbitrage,    // Buy low, sell high across DEXs
    YieldFarming, // Stake and earn yields
    Rebalancing,  // Portfolio rebalancing
    Custom,       // User-defined
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StrategyParameters {
    pub input_token: Pubkey,     // Token to trade
    pub output_token: Pubkey,    // Target token
    pub min_profit_bps: u16,     // Minimum profit (basis points)
    pub max_slippage_bps: u16,   // Max slippage tolerance
    pub execution_interval: i64, // How often to execute (seconds)
}

impl Strategy {
    pub const MAX_SIZE: usize = 8 + // discriminator
        32 +  // creator
        8 +   // strategy_id
        (4 + 50) +  // name
        (4 + 200) + // description
        8 +   // price
        1 +   // is_active
        8 +   // total_purchases
        8 +   // total_executions
        8 +   // total_profit
        2 +   // success_rate
        8 +   // created_at
        1 +   // strategy_type enum
        (32 + 32 + 2 + 2 + 8) + // parameters
        1; // bump
}
