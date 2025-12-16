use crate::instructions::vault::StrategyType;
use anchor_lang::prelude::*;
#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub shares: u64,
    pub total_assets: u64,
    pub total_shares: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub shares: u64,
    pub amount: u64,
    pub total_assets: u64,
    pub total_shares: u64,
    pub timestamp: i64,
}

#[event]
pub struct StrategyExecutedEvent {
    pub vault: Pubkey,
    pub strategy_type: StrategyType,
    pub amount: u64,
    pub timestamp: i64,
}
