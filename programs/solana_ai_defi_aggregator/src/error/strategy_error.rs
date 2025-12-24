use anchor_lang::prelude::*;
#[error_code]
pub enum StrategyError {
    #[msg("Strategy name too long (max 50 characters)")]
    NameTooLong,
    #[msg("Description too long (max 200 characters)")]
    DescriptionTooLong,
    #[msg("Strategy is not active")]
    StrategyInactive,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Unauthorized")]
    Unauthorized,
}
