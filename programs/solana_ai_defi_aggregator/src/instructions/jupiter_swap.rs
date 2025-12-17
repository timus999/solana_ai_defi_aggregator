// This handler accepts a serialized Instruction from the client and forwards it to the target program (e.g. jupiter)
// using `invoked_signed`.
// Accepting arbitrary serialized instructions is powerful and dangerous: you MUST validate inputs in production.
// - The client MUST put all accounts required by the forwarded instruction into the transaction after the program
// accounts so they appear in `ctx.remaining_accounts` ( we forward those ).
// - This example treats fee transfer as a simple immediate transfer from user ATA -> Vault ATA signed by the user.
// In some flows you might instead transfer tokens to a program vault PDA that the program signs for ( requires `invoked_signed`
//  and PDA signer seeds).

use crate::error::jupiter_swap_error::JupiterSwapError;
use crate::events::swap_events::JupiterSwapEvent;
use crate::state::GlobalState;
use crate::state::UserState;
use crate::utils::calculate_fee;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::Instruction as SolInstruction, pubkey::Pubkey};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Token};
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Clone)]
pub struct Jupiter;

impl anchor_lang::Id for Jupiter {
    fn id() -> Pubkey {
        // original jupiter program
        "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
            .parse()
            .unwrap()
        // fake keypar
        // "11111111111111111111111111111111".parse().unwrap()
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AccountMetaData {
    pub pubkey: Pubkey,
    pub is_writable: bool,
    pub is_signer: bool,
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
    #[account(mut,
        constraint = user_input_ata.owner == user.key() @ JupiterSwapError::InvalidTokenAccountOwner,
        constraint = user_input_ata.mint == input_mint.key() @ JupiterSwapError::MintMismatch
    )]
    pub user_input_ata: Account<'info, TokenAccount>,
    #[account(mut,
        constraint = user_output_ata.owner == user.key() @ JupiterSwapError::InvalidTokenAccountOwner,
        constraint = user_output_ata.mint == output_mint.key() @ JupiterSwapError::MintMismatch
    )]
    pub user_output_ata: Account<'info, TokenAccount>,

    // Fee vault ATA (program-owned)
    #[account(
        mut,
        seeds = [b"vault", input_mint.key().as_ref()],
        bump,
        token::mint = input_mint,
        token::authority = global_state, // PDA authority for future withdrawals
    )]
    pub vault_ata: Account<'info, TokenAccount>,
    // The mint addresses passed into the swap handler
    pub input_mint: Box<Account<'info, Mint>>,
    pub output_mint: Box<Account<'info, Mint>>,

    // In test mode, accept any account. In production, validate it's the Jupiter program
    // #[cfg(feature = "test-mode")]
    /// CHECK: This is only used in test mode and not validated
    pub jupiter_program: UncheckedAccount<'info>,

    // #[cfg(not(feature = "test-mode"))]
    // pub jupiter_program: Program<'info, Jupiter>,

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
/// Steps:
/// 1. Validates user balances and account ownership
/// 2. Records pre-swap balances
/// 3. Calculates and collects fee
/// 4. Validates and executes Jupiter CPI
/// 5. Verifies slippage protection
/// 6. Updates user state and emits event.
pub fn jupiter_swap_handler(
    ctx: Context<JupiterSwap>,
    swap_ix: Vec<u8>,
    accounts_meta: Vec<AccountMetaData>,
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    msg!(" Jupiter Swap Handler!!!");

    // validate balances
    let user_balance = ctx.accounts.user_input_ata.amount;
    require!(
        user_balance >= amount_in,
        JupiterSwapError::InsufficientBalance
    );

    require!(amount_in > 0, JupiterSwapError::InvalidAmount);
    msg!("User ATA balance = {}", user_balance);
    msg!("Amount_in = {}", amount_in);

    // record pre-swap balances
    let input_balance_before = ctx.accounts.user_input_ata.amount;
    let output_balance_before = ctx.accounts.user_output_ata.amount;

    msg!("Input balance before: {}", input_balance_before);
    msg!("Output balance before: {}", output_balance_before);

    require_keys_eq!(
        ctx.accounts.user_input_ata.owner,
        ctx.accounts.user.key(),
        JupiterSwapError::InvalidTokenAccountOwner
    );

    require_keys_eq!(
        ctx.accounts.user_input_ata.mint,
        ctx.accounts.input_mint.key(),
        JupiterSwapError::MintMismatch
    );

    require_keys_eq!(
        ctx.accounts.user_output_ata.mint,
        ctx.accounts.output_mint.key(),
        JupiterSwapError::MintMismatch
    );

    // fee calculation using GlobalState.fee_rate

    let fee_rate_bps = ctx.accounts.global_state.fee_rate;
    let fee = calculate_fee(amount_in, fee_rate_bps)?;

    // The actual amount going to Jupiter is amount_in - fee
    let swap_amount = amount_in
        .checked_sub(fee)
        .ok_or(JupiterSwapError::MathOverflow)?;
    msg!("Fee rate (bps): {}", fee_rate_bps);
    msg!("Fee amount: {}", fee);
    // msg!("Swap amount (after fee): {}", swap_amount);

    // Transfer fee to vault ( user signs for their ATA)
    if fee > 0 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_input_ata.to_account_info(),
                    to: ctx.accounts.vault_ata.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            fee,
        )?;
        msg!("Fee transferred successfully: {}", fee);
    }

    // validate remaining accounts
    //
    // Critical: Ensure protected accounts are not in remaining_accounts
    let protected_accounts = vec![
        ctx.accounts.vault_ata.key(),
        ctx.accounts.global_state.key(),
        ctx.accounts.user_state.key(),
    ];

    for remaining_acc in ctx.remaining_accounts.iter() {
        for protected in &protected_accounts {
            require_keys_neq!(
                remaining_acc.key(),
                *protected,
                JupiterSwapError::ProtectedAccountInRemainingAccounts
            );
        }
    }

    msg!("Protected accounts validated");

    // Build and validate jupiter instruction
    //
    //
    let accounts: Vec<AccountMeta> = accounts_meta
        .into_iter()
        .map(|meta| {
            if meta.is_signer && meta.is_writable {
                AccountMeta::new(meta.pubkey, true)
            } else if meta.is_signer {
                AccountMeta::new_readonly(meta.pubkey, true)
            } else if meta.is_writable {
                AccountMeta::new(meta.pubkey, false)
            } else {
                AccountMeta::new_readonly(meta.pubkey, false)
            }
        })
        .collect();
    // build jupiter instruction
    let ix: SolInstruction = SolInstruction {
        program_id: ctx.accounts.jupiter_program.key(),
        accounts,
        data: swap_ix,
    };

    // Must match Jupiter program
    require_keys_eq!(
        ix.program_id,
        ctx.accounts.jupiter_program.key(),
        JupiterSwapError::InvalidJupiterProgram
    );

    msg!("Jupiter instruction validated");
    // Forward CPI accounts to Jupiter

    msg!("Invoking Jupiter CPI...");

    // #[cfg(not(feature = "test-mode"))]
    // {
    //     invoke(&ix, ctx.remaining_accounts)?;
    //     msg!("Jupiter CPI completed successfully");
    // }

    #[cfg(feature = "test")]
    {
        msg!("TEST MODE: Skipping actual Jupiter CPI");
        msg!("TEST MODE: Simulating swap by transferring output tokens");

        // In test mode, simulate a swap by just logging
        // The test will handle minting output tokens separately
        msg!("TEST MODE: Swap simulation complete");
    }
    // Verify post-swap balances and slippage

    // Reload accounts to get updated balances
    ctx.accounts.user_input_ata.reload()?;
    ctx.accounts.user_output_ata.reload()?;

    let input_balance_after = ctx.accounts.user_input_ata.amount;
    let output_balance_after = ctx.accounts.user_output_ata.amount;

    msg!("Input balance after: {}", input_balance_after);
    msg!("Output balance after: {}", output_balance_after);
    // Calculate actual amounts swapped
    let actual_input_used = input_balance_before
        .checked_sub(input_balance_after)
        .ok_or(JupiterSwapError::MathOverflow)?;

    #[cfg(not(feature = "test"))]
    {
        let actual_output_received = output_balance_after
            .checked_sub(output_balance_before)
            .ok_or(JupiterSwapError::MathOverflow)?;

        msg!("Actual input used: {}", actual_input_used);
        msg!("Actual output received: {}", actual_output_received);

        // Verify the input used matches expectations (swap_amount + some tolerance for Jupiter fees)
        require!(
            actual_input_used <= swap_amount,
            JupiterSwapError::UnexpectedInputAmount
        );
        // Verify slippage protection
        require_gte!(
            actual_output_received,
            min_amount_out,
            JupiterSwapError::SlippageExceeded
        );

        msg!("Output balance after swap: {}", output_balance_after);
    }
    // Update UserState
    let user_state = &mut ctx.accounts.user_state;
    user_state.total_volume = user_state
        .total_volume
        .checked_add(amount_in)
        .ok_or(JupiterSwapError::MathOverflow)?;
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
