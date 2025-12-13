use anchor_lang::prelude::*;

#[error_code]
pub enum JupiterSwapError {
    #[msg("Insufficient balance in user's token account")]
    InsufficientBalance,

    #[msg("Invalid token account owner")]
    InvalidTokenAccountOwner,

    #[msg("Mint mismatch between accounts")]
    MintMismatch,

    #[msg("Invalid Jupiter program ID")]
    InvalidJupiterProgram,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Math overflow occurred")]
    MathOverflow,

    #[msg("Invalid amount (must be > 0)")]
    InvalidAmount,

    #[msg("Invalid fee rate (must be <= 10000 bps)")]
    InvalidFeeRate,

    #[msg("Protected account found in remaining accounts")]
    ProtectedAccountInRemainingAccounts,

    #[msg("Unexpected input amount used in swap")]
    UnexpectedInputAmount,
}
