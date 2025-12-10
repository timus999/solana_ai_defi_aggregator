use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;
declare_id!("Y66qK5L367WXqaS3vsauu3z7V7ppQuL3Lj6FwuHKBPx");

#[program]
pub mod solana_ai_defi_aggregator {
    use super::*;

    pub fn initialize_global_state(
        ctx: Context<InitializeGlobalState>,
        fee_rate: u16,
    ) -> Result<()> {
        instructions::initialize_global_state::initialize_global_state_handler(ctx, fee_rate)
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
        accounts_meta: Vec<Pubkey>,
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
}
