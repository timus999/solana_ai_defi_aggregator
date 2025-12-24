use anchor_lang::prelude::*;

pub mod error;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;
declare_id!("6VM1KADvmpRuRzr2rHbMudFgFTbR9AbCN76QN8ksoH26");

#[program]
pub mod solana_ai_defi_aggregator {
    use super::*;

    pub fn initialize_global_state(
        ctx: Context<InitializeGlobalState>,
        fee_rate: u16,
    ) -> Result<()> {
        instructions::initialize_global_state::initialize_global_state_handler(ctx, fee_rate)
    }

    pub fn initialize_fee_vault(ctx: Context<InitializeFeeVault>) -> Result<()> {
        instructions::initialize_fee_vault::initialize_fee_vault(ctx)
    }

    pub fn register_user(ctx: Context<RegisterUser>) -> Result<()> {
        instructions::register_user::register_user_handler(ctx)
    }

    pub fn execute_swap(
        ctx: Context<ExecuteSwap>,
        amount: u64,
        min_amount_out: u64,
        input_mint: Pubkey,
        output_mint: Pubkey,
    ) -> Result<()> {
        instructions::execute_swap::execute_swap_handler(
            ctx,
            amount,
            min_amount_out,
            input_mint,
            output_mint,
        )
    }

    // ===========================================
    // Jupiter Swap Instruction
    // ===========================================

    // pub fn emit_swap_event(ctx: Context<EmitSwapEvent>, amount: u64) -> Result<()> {
    //     instructions::emit_swap_event::handler(ctx, amount)
    // }
    /// This handler receives a serialized Jupiter swap instruction (swap_ix) from the client and
    /// performs 'invoked_signed' to the Jupiter program using the provided remaining_accounts.
    /// WARNING: the client must provide the exact accounts Jupiter expects; your program will
    /// forward those accounts in `ctx.remaining_accounts` during `invoke_signed`.
    pub fn jupiter_swap(
        ctx: Context<JupiterSwap>,
        swap_ix: Vec<u8>,
        accounts_meta: Vec<AccountMetaData>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        instructions::jupiter_swap::jupiter_swap_handler(
            ctx,
            swap_ix,
            accounts_meta,
            amount_in,
            min_amount_out,
        )
    }

    // ===========================================
    // Vault Instructions
    // ===========================================
    //
    //
    pub fn initialize_vault(ctx: Context<InitializeVault>, performance_fee_bps: u16) -> Result<()> {
        instructions::vault::initialize_vault(ctx, performance_fee_bps)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::vault::deposit(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        instructions::vault::withdraw(ctx, shares)
    }

    pub fn execute_strategy(
        ctx: Context<ExecuteStrategy>,
        strategy_type: StrategyType,
        amount: u64,
        min_output: u64,
        swap_ix_data: Vec<u8>,
        accounts_meta: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::vault::execute_strategy(
            ctx,
            strategy_type,
            amount,
            min_output,
            swap_ix_data,
            accounts_meta,
        )
    }

    pub fn set_strategy_enabled(ctx: Context<SetStrategyEnabled>, enabled: bool) -> Result<()> {
        instructions::vault::set_strategy_enabled(ctx, enabled)
    }

    #[cfg(feature = "test")]
    pub fn test_increase_assets(ctx: Context<TestIncreaseAssets>, amount: u64) -> Result<()> {
        instructions::test_increase_assets(ctx, amount)
    }
}
