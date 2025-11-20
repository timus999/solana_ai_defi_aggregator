use anchor_lang::prelude::*;

#[account]
pub struct UserState {
    pub user: Pubkey,
    pub bump: u8,
    pub total_volume: u64,
    pub swaps: u64,
}

impl UserState {
    pub const LEN: usize = 32 + 1 + 8 + 8;
}
