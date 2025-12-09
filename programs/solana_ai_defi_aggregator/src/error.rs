use anchor_lang::prelude::*;

#[error_code]
pub enum JupiterSwapError {
    #[msg("Invalid Jupiter Swap Instruction")]
    InvalidJupiterSwapInstruction,

    #[msg("Insufficient token balance")]
    InsufficientBalance,

    #[msg("Invalid swap instruction")]
    InvalidSwapInstruction,

    #[msg("Jupiter CPI failed")]
    JupiterCPIFailed,
}
