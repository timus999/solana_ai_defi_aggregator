// This handler accepts a serialized Instruction from the client and forwards it to the target program (e.g. jupiter)
// using `invoked_signed`.
// Accepting arbitrary serialized instructions is powerful and dangerous: you MUST validate inputs in production.
// - The client MUST put all accounts required by the forwarded instruction into the transaction after the program
// accounts so they appear in `ctx.remaining_accounts` ( we forward those ).
// - This example treats fee transfer as a simple immediate transfer from user ATA -> Vault ATA signed by the user.
// In some flows you might instead transfer tokens to a program vault PDA that the program signs for ( requires `invoked_signed`
//  and PDA signer seeds).

use crate::error::JupiterSwapError;
use crate::state::GlobalState;
use crate::state::UserState;
use crate::utils::calculate_fee;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::Instruction as SolInstruction, program::invoke, pubkey::Pubkey,
};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Token};
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Clone)]
pub struct Jupiter;

impl anchor_lang::Id for Jupiter {
    fn id() -> Pubkey {
        // original jupiter program
        // "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
        // fake keypar
        "11111111111111111111111111111111".parse().unwrap()
    }
}

#[derive(Accounts)]
pub struct JupiterSwap<'info> {
    // user who initiated the swap
    #[account(mut)]
    pub user: Signer<'info>,

    // PDA: global state (contains fee_rate)
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    // PDA: user state
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user_state.bump
    )]
    pub user_state: Account<'info, UserState>,

    // token accounts
    #[account(mut)]
    pub user_input_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_output_ata: Account<'info, TokenAccount>,

    // The mint addresses passed into the swap handler
    pub input_mint: Box<Account<'info, Mint>>,
    pub output_mint: Box<Account<'info, Mint>>,

    // Jupiter program
    pub jupiter_program: Program<'info, Jupiter>,

    // System/SPL deps
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// - computes fee from global_state.fee_rate
/// - transfers fee from user_input_ata -> vault_ata (user must sign)
/// - deserializes client-provided serialized instruction (swap_ix) and invokes it,
///   forwarding ctx.remaining_accounts as the accounts the instruction needs.
/// - updates user_state (total_volume, swaps) and emits an event.
///
/// Note: In production you should pass the explicit `amount_in` from the client (and verify
/// the user's ATA balance and that the swap_ix uses the same amount), and verify `swap_program_id`.

pub fn handler(
    ctx: Context<JupiterSwap>,
    swap_ix: Vec<u8>,
    accounts_meta: Vec<Pubkey>,
    amount_in: u64,
) -> Result<()> {
    msg!(" Jupiter Swap Handler!!!");

    // validate balances
    let user_balance = ctx.accounts.user_input_ata.amount;
    require!(
        user_balance >= amount_in,
        JupiterSwapError::InsufficientBalance
    );
    msg!("User ATA balance = {}", user_balance);
    msg!("Amount_in = {}", amount_in);

    // fee calculation using GlobalState.fee_rate

    let fee_rate_bps = ctx.accounts.global_state.fee_rate;
    let fee = calculate_fee(amount_in, fee_rate_bps);
    msg!("Fee =  {}", fee);

    let accounts = accounts_meta
        .into_iter()
        .map(|pubkey| AccountMeta::new(pubkey, false))
        .collect::<Vec<_>>();

    msg!("Fee transferred successfully");

    // Deserialize jupiter instruction
    let ix: SolInstruction = SolInstruction {
        program_id: ctx.accounts.jupiter_program.key(),
        accounts,
        data: swap_ix,
    };

    // Must match Jupiter program
    require_keys_eq!(
        ix.program_id,
        ctx.accounts.jupiter_program.key(),
        JupiterSwapError::InvalidJupiterSwapInstruction
    );

    // Forward CPI accounts to Jupiter

    msg!("Invoking Jupiter CPI...");

    invoke(&ix, ctx.remaining_accounts)?;
    msg!("Jupiter CPI invoked successfully");

    // Update UserState
    let user_state = &mut ctx.accounts.user_state;
    user_state.total_volume = user_state.total_volume.checked_add(amount_in).unwrap();
    user_state.swaps += 1;

    msg!("User state updated successfully");

    // Emit event
    emit!(JupiterSwapEvent {
        user: ctx.accounts.user.key(),
        input_mint: ctx.accounts.input_mint.key(),
        output_mint: ctx.accounts.output_mint.key(),
        amount_in,
        fee,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!(" Jupiter Swap executed successfully");

    Ok(())
}

#[event]
pub struct JupiterSwapEvent {
    user: Pubkey,
    input_mint: Pubkey,
    output_mint: Pubkey,
    amount_in: u64,
    fee: u64,
    timestamp: i64,
}
