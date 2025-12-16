use anchor_lang::prelude::*;

#[event]
pub struct SwapEvent {
    pub user: Pubkey,
    pub amount_in: u64,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub swap_id: u64,
    pub timestamp: i64,
}
#[event]
pub struct GlobalStateInitialized {
    pub admin: Pubkey,
    pub fee_rate: u16,
}

#[event]
pub struct JupiterSwapEvent {
    pub user: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub amount_in: u64,
    pub fee: u64,
    pub timestamp: i64,
}
#[event]
pub struct UserRegistered {
    pub user: Pubkey,
}
