use anchor_lang::prelude::*;

#[error_code]
pub enum JupiterSwapError {
    #[msg("Insufficient balance for swap")]
    InsufficientBalance,
    #[msg("Invalid Jupiter swap instruction")]
    InvalidJupiterSwapInstruction,
    #[msg("Invalid token account owner")]
    InvalidTokenAccountOwner,
    #[msg("Mint mismatch")]
    MintMismatch,
    #[msg("Invalid accounts meta")]
    InvalidAccountsMeta,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Jupiter CPI failed")]
    JupiterCPIFailed,
}
