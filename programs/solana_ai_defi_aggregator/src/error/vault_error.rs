use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Cannot deposit/withdraw zero amount")]
    ZeroAmount,
    #[msg("Cannot mint/burn zero shares")]
    ZeroShares,
    #[msg("Calculated zero assets")]
    ZeroAssets,
    #[msg("No shares exist in vault")]
    NoShares,
    #[msg("Mint mismatch")]
    MintMismatch,
    #[msg("Invalid account owner")]
    InvalidOwner,
    #[msg("Insufficient assets in vault")]
    InsufficientAssets,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Strategy not enabled")]
    StrategyDisabled,
    #[msg("Invalid fee (max 50%)")]
    InvalidFee,
    #[msg("Strategy not implemented")]
    StrategyNotImplemented,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Protected account in remaining accounts")]
    ProtectedAccountInRemainingAccounts,

    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Invalid fee rate")]
    InvalidFeeRate,
}
