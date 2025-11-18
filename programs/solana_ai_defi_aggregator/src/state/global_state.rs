use anchor_lang::prelude::*;

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub bump: u8,
    pub fee_bps: u16,
    pub version: u8,
}
