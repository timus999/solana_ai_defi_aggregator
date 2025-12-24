use anchor_lang::prelude::*;
pub mod deposit;
pub mod execute_strategy;
pub mod initialize_vault;
pub mod manage;
pub mod withdraw;

pub use deposit::*;
pub use execute_strategy::*;
pub use initialize_vault::*;
pub use manage::*;
pub use withdraw::*;

// Re-export strategy type

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum JupiterStrategyType {
    JupiterSwap,
    Rebalance,
    Yield,
}
