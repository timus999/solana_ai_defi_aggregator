use anchor_lang::prelude::*;
// User's purchased strategies
#[account]
pub struct UserStrategy {
    pub owner: Pubkey,
    pub strategy: Pubkey,
    pub purchased_at: i64,
    pub times_executed: u64,
    pub total_profit: i64,
    pub bump: u8,
}

impl UserStrategy {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1;
}
