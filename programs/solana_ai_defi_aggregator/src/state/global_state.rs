use anchor_lang::prelude::*;

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub fee_rate: u16,
    pub bump: u8,
}

impl GlobalState {
    pub const LEN: usize = 32 + 1 + 2 + 1;
}
