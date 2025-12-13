use crate::error::JupiterSwapError;
use anchor_lang::prelude::*;
/// Calculate fee with overflow protection and proper rounding
/// Fee is rounded UP to ensure we never lose fees due to rounding
pub fn calculate_fee(amount: u64, fee_rate_bps: u16) -> Result<u64> {
    require!(fee_rate_bps <= 10000, JupiterSwapError::InvalidFeeRate);

    if fee_rate_bps == 0 || amount == 0 {
        return Ok(0);
    }

    // Calculate fee: (amount * fee_rate_bps) / 10000
    // Add 9999 before division to round up
    let numerator = (amount as u128)
        .checked_mul(fee_rate_bps as u128)
        .ok_or(JupiterSwapError::MathOverflow)?;

    let fee = numerator
        .checked_add(9999)
        .ok_or(JupiterSwapError::MathOverflow)?
        .checked_div(10000)
        .ok_or(JupiterSwapError::MathOverflow)?;

    // Ensure fee fits in u64
    require!(fee <= u64::MAX as u128, JupiterSwapError::MathOverflow);

    Ok(fee as u64)
}
