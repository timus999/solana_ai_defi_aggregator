use crate::error::VaultError;
use crate::state::StrategyParameters;

pub fn calculate_profit(
    input_used: u64,
    output_received: u64,
    parameters: &StrategyParameters,
) -> Result<i64, VaultError> {
    // Simplified profit calculation
    // In production, you'd:
    // 1. Get prices from Pyth oracle
    // 2. Convert both to USD
    // 3. Calculate actual profit

    // For now, basic calculation assuming min_profit_bps target
    let expected_min_output = (input_used as u128)
        .checked_mul(10000 + parameters.min_profit_bps as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(10000)
        .ok_or(VaultError::MathOverflow)? as u64;

    let profit = (output_received as i64)
        .checked_sub(expected_min_output as i64)
        .ok_or(VaultError::MathOverflow)?;

    Ok(profit)
}
