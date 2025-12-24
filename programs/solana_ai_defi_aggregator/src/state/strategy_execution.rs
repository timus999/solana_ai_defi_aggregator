use anchor_lang::prelude::*;

// Strategy execution record
#[account]
pub struct StrategyExecution {
    pub strategy: Pubkey,
    pub executor: Pubkey,
    pub executed_at: i64,
    pub input_amount: u64,
    pub output_amount: u64,
    pub profit: i64,
    pub success: bool,
    pub bump: u8,
}

impl StrategyExecution {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1;
}
