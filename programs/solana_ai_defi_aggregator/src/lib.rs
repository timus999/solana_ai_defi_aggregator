use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

declare_id!("Y66qK5L367WXqaS3vsauu3z7V7ppQuL3Lj6FwuHKBPx");

#[program]
pub mod aggregator {
    use super::*;

    pub fn initialize_global_state(ctx: Context<InitializeGlobalState>) -> Result<()> {
        instructions::initialize_global_state::handler(ctx)
    }

    pub fn register_user(ctx: Context<RegisterUser>) -> Result<()> {
        instructions::register_user::handler(ctx)
    }

    pub fn execute_swap(ctx: Context<ExecuteSwap>, amount: u64) -> Result<()> {
        instructions::execute_swap::handler(ctx, amount)
    }

    pub fn emit_swap_event(ctx: Context<EmitSwapEvent>, amount: u64) -> Result<()> {
        instructions::emit_swap_event::handler(ctx, amount)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
