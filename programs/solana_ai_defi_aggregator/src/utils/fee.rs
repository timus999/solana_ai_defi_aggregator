pub fn calculate_fee(amount: u64, fee_rate: u16) -> u64 {
    (amount as u128 * fee_rate as u128 / 10_000) as u64
}
