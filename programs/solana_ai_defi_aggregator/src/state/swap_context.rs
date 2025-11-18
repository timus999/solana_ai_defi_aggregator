use anchor_lang::prelude::*;

#[account]
pub struct SwapContext {
    pub user: Pubkey,
    pub amount: u64,
    pub bump: u8,
    pub created_at: i64,
}
