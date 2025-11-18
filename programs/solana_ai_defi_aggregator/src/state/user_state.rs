use anchor_lang::prelude::*;

#[account]
pub struct UserState {
    pub user: Pubkey,
    pub bump: u8,
    pub total_swaps: u64,
}
