use anchor_lang::prelude::*;

// each user can have unlimited swaps
// every swap is uniquely indexed
// program can easily find old swaps
//
#[account]
pub struct SwapContext {
    pub user: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub amount_in: u64,
    pub min_amount_out: u64,
    pub timestamp: i64,
    pub bump: u8,
}

impl SwapContext {
    pub const LEN: usize = 32 + // user
    32 + // input_mint
    32 + // output_mint
    8 + // amount_in
    8 + // min_amount_out
    8 + // timestamp
    1; // bump
}
