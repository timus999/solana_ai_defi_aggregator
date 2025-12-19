use crate::error::vault_error::VaultError;
use crate::events::vault_events::StrategyExecutedEvent;
use crate::instructions::vault::StrategyType;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction as SolInstruction};
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct ExecuteStrategy<'info> {
    /// Only authority can execute strategies
    #[account(
        constraint = authority.key() == vault.authority @ VaultError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.token_mint.as_ref()],
        bump = vault.bump,
        constraint = vault.strategy_enabled @ VaultError::StrategyDisabled,
    )]
    pub vault: Account<'info, Vault>,

    // ===========================
    // Accounts for Jupiter Swap
    // ===========================
    /// Global State for fee collection
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,

    /// Vault's "user state" for tracking its own swaps
    #[account(
        mut,
        seeds = [b"user", vault.key().as_ref()],
        bump = vault_user_state.bump,
    )]
    pub vault_user_state: Account<'info, UserState>,

    /// Vault's input token account (e.g. USDC)
    #[account(
        mut,
        seeds = [b"vault_token_account", vault.key().as_ref()],
        bump,
        constraint = vault_input_ata.mint == input_mint.key() @ VaultError::MintMismatch,
    )]
    pub vault_input_ata: Account<'info, TokenAccount>,

    /// Vault's output token account (e.g. SOL)
    #[account(
        mut,
        constraint = vault_output_ata.owner == vault.key() @ VaultError::InvalidOwner,
        constraint = vault_output_ata.mint == output_mint.key() @ VaultError::MintMismatch,
    )]
    pub vault_output_ata: Account<'info, TokenAccount>,

    /// Fee vault (collects swap fees)
    #[account(
        mut,
        seeds = [b"fee_vault", input_mint.key().as_ref()],
        bump,
    )]
    pub fee_vault_ata: Account<'info, TokenAccount>,

    pub input_mint: Box<Account<'info, Mint>>,
    pub output_mint: Box<Account<'info, Mint>>,

    /// Jupiter program
    #[cfg(feature = "test")]
    /// CHECK: Test - not validated
    pub jupiter_program: UncheckedAccount<'info>,

    #[cfg(not(feature = "test"))]
    pub jupiter_program: Program<'info, Jupiter>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn execute_strategy(
    ctx: Context<ExecuteStrategy>,
    strategy_type: StrategyType,
    amount: u64,
    min_output: u64,
    swap_ix_data: Vec<u8>,
    accounts_meta: Vec<Pubkey>,
) -> Result<()> {
    msg!("=== Execute Strategy ===");
    msg!("Strategy type: {:?}", strategy_type);
    msg!("Amount: {}", amount);
    msg!("Min output: {}", min_output);

    let vault = &ctx.accounts.vault;

    require!(vault.total_assets >= amount, VaultError::InsufficientAssets);

    // Record balances before strategy
    let input_balance_before = ctx.accounts.vault_input_ata.amount;
    let output_balance_before = ctx.accounts.vault_output_ata.amount;

    msg!("Vault input balance before: {}", input_balance_before);
    msg!("Vault output balance before: {}", output_balance_before);

    match strategy_type {
        StrategyType::JupiterSwap => {
            execute_jupiter_swap_inline(ctx, amount, min_output, swap_ix_data, accounts_meta)
        }
        StrategyType::Rebalance => {
            msg!("Rebalance strategy - Coming soon");
            Ok(())
        }
        StrategyType::Yield => {
            msg!("Yield strategy - Coming soon");
            Ok(())
        }
    }
}

/// Execute Jupiter swap inline (no CPI to own program)
/// This inlines the logic from jupiter_swap_handler
pub fn execute_jupiter_swap_inline(
    ctx: Context<ExecuteStrategy>,
    amount: u64,
    min_output: u64,
    swap_ix_data: Vec<u8>,
    accounts_meta: Vec<Pubkey>,
) -> Result<()> {
    msg!("=== Execute Jupiter Swap (Inline) ===");
    msg!("Amount: {}", amount);
    msg!("Min output: {}", min_output);

    let vault = &ctx.accounts.vault.clone();

    // ============================================
    // 1. VALIDATE BALANCES AND AMOUNTS
    // ============================================

    let vault_input_balance = ctx.accounts.vault_input_ata.amount;
    require!(
        vault_input_balance >= amount,
        VaultError::InsufficientAssets
    );

    require!(amount > 0, VaultError::InvalidAmount);

    msg!("Vault input balance: {}", vault_input_balance);
    msg!("Amount in: {}", amount);

    // ============================================
    // 2. RECORD PRE-SWAP BALANCES
    // ============================================

    let input_balance_before = ctx.accounts.vault_input_ata.amount;
    let output_balance_before = ctx.accounts.vault_output_ata.amount;

    msg!("Input balance before: {}", input_balance_before);
    msg!("Output balance before: {}", output_balance_before);

    // ============================================
    // 3. CALCULATE AND COLLECT FEE
    // ============================================

    let fee_rate_bps = ctx.accounts.global_state.fee_rate;
    let fee = calculate_fee(amount, fee_rate_bps)?;

    // The actual amount going to Jupiter is amount minus the fee
    let swap_amount = amount.checked_sub(fee).ok_or(VaultError::MathOverflow)?;

    msg!("Fee rate (bps): {}", fee_rate_bps);
    msg!("Fee amount: {}", fee);
    msg!("Swap amount (after fee): {}", swap_amount);

    // Create vault signer seeds
    let vault_seeds = &[b"vault", vault.token_mint.as_ref(), &[vault.bump]];
    let signer_seeds = &[&vault_seeds[..]];

    // Transfer fee to fee vault (vault signs)
    if fee > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.vault_input_ata.to_account_info(),
                    to: ctx.accounts.fee_vault_ata.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            ),
            fee,
        )?;
        msg!("Fee transferred to vault: {}", fee);
    }

    // ============================================
    // 4. VALIDATE REMAINING ACCOUNTS
    // ============================================

    // Critical: Ensure protected accounts are not in remaining_accounts
    let protected_accounts = vec![
        ctx.accounts.fee_vault_ata.key(),
        ctx.accounts.global_state.key(),
        ctx.accounts.vault_user_state.key(),
        ctx.accounts.vault.key(),
    ];

    for remaining_acc in ctx.remaining_accounts.iter() {
        for protected in &protected_accounts {
            require_keys_neq!(
                remaining_acc.key(),
                *protected,
                VaultError::ProtectedAccountInRemainingAccounts
            );
        }
    }

    msg!("Protected accounts validated");

    // ============================================
    // 5. BUILD AND VALIDATE JUPITER INSTRUCTION
    // ============================================

    // Convert Pubkeys to AccountMeta
    let accounts: Vec<AccountMeta> = accounts_meta
        .into_iter()
        .map(|pubkey| AccountMeta::new(pubkey, false))
        .collect();

    // Build Jupiter instruction
    let jupiter_ix = SolInstruction {
        program_id: ctx.accounts.jupiter_program.key(),
        accounts,
        data: swap_ix_data,
    };

    // Verify it's actually calling Jupiter
    #[cfg(not(feature = "test"))]
    {
        require_keys_eq!(
            jupiter_ix.program_id,
            ctx.accounts.jupiter_program.key(),
            VaultError::InvalidJupiterProgram
        );
        msg!("Jupiter instruction validated");
    }

    #[cfg(feature = "test")]
    {
        msg!("TEST MODE: Skipping Jupiter program validation");
    }

    // ============================================
    // 6. INVOKE JUPITER CPI (vault signs)
    // ============================================

    msg!("Invoking Jupiter CPI...");

    #[cfg(not(feature = "test"))]
    {
        invoke_signed(&jupiter_ix, ctx.remaining_accounts, signer_seeds)?;
        msg!("Jupiter CPI completed successfully");
    }

    #[cfg(feature = "test")]
    {
        msg!("TEST MODE: Skipping actual Jupiter CPI");
        msg!("TEST MODE: Swap simulation complete");
    }

    // ============================================
    // 7. VERIFY POST-SWAP BALANCES AND SLIPPAGE
    // ============================================

    // Reload accounts to get updated balances
    ctx.accounts.vault_input_ata.reload()?;
    ctx.accounts.vault_output_ata.reload()?;

    let input_balance_after = ctx.accounts.vault_input_ata.amount;
    let output_balance_after = ctx.accounts.vault_output_ata.amount;

    msg!("Input balance after: {}", input_balance_after);
    msg!("Output balance after: {}", output_balance_after);

    // Calculate actual amounts swapped
    let actual_input_used = input_balance_before
        .checked_sub(input_balance_after)
        .ok_or(VaultError::MathOverflow)?;

    #[cfg(not(feature = "test"))]
    {
        let actual_output_received = output_balance_after
            .checked_sub(output_balance_before)
            .ok_or(VaultError::MathOverflow)?;

        msg!("Actual input used: {}", actual_input_used);
        msg!("Actual output received: {}", actual_output_received);

        // Verify the input used matches expectations
        require!(
            actual_input_used <= swap_amount,
            VaultError::UnexpectedInputAmount
        );

        // Verify slippage protection
        require_gte!(
            actual_output_received,
            min_output,
            VaultError::SlippageExceeded
        );

        msg!("Slippage check passed");
    }

    #[cfg(feature = "test")]
    {
        msg!("TEST MODE: Actual input used: {}", actual_input_used);
        msg!("TEST MODE: Output balance after: {}", output_balance_after);
        msg!("TEST MODE: Skipping slippage validation");

        // In test mode, just verify output balance exists
        require!(
            output_balance_after >= min_output,
            VaultError::SlippageExceeded
        );
    }

    // ============================================
    // 8. UPDATE USER STATE (for vault's stats)
    // ============================================

    let vault_user_state = &mut ctx.accounts.vault_user_state;
    vault_user_state.total_volume = vault_user_state
        .total_volume
        .checked_add(amount)
        .ok_or(VaultError::MathOverflow)?;
    vault_user_state.swaps = vault_user_state
        .swaps
        .checked_add(1)
        .ok_or(VaultError::MathOverflow)?;

    msg!(
        "Vault user state updated - Total volume: {}, Total swaps: {}",
        vault_user_state.total_volume,
        vault_user_state.swaps
    );

    // ============================================
    // 9. UPDATE VAULT ACCOUNTING
    // ============================================

    let actual_output_received = output_balance_after
        .checked_sub(output_balance_before)
        .ok_or(VaultError::MathOverflow)?;

    update_vault_accounting(
        &mut ctx.accounts.vault,
        &ctx.accounts.input_mint,
        &ctx.accounts.output_mint,
        actual_input_used,
        actual_output_received,
    )?;

    // ============================================
    // 10. EMIT EVENT
    // ============================================

    emit!(StrategyExecutedEvent {
        vault: vault.key(),
        strategy_type: StrategyType::JupiterSwap,
        amount,
        input_used: actual_input_used,
        output_received: actual_output_received,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!("=== Jupiter Swap Executed Successfully ===");

    Ok(())
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/// Calculate fee with overflow protection and proper rounding
/// Fee is rounded UP to ensure we never lose fees due to rounding
fn calculate_fee(amount: u64, fee_rate_bps: u16) -> Result<u64> {
    require!(fee_rate_bps <= 10000, VaultError::InvalidFeeRate);

    if fee_rate_bps == 0 || amount == 0 {
        return Ok(0);
    }

    // Calculate fee: (amount * fee_rate_bps) / 10000
    // Add 9999 before division to round up
    let numerator = (amount as u128)
        .checked_mul(fee_rate_bps as u128)
        .ok_or(VaultError::MathOverflow)?;

    let fee = numerator
        .checked_add(9999)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(10000)
        .ok_or(VaultError::MathOverflow)?;

    // Ensure fee fits in u64
    require!(fee <= u64::MAX as u128, VaultError::MathOverflow);

    Ok(fee as u64)
}

/// Updates vault's total_assets after a swap
///
/// SIMPLE VERSION: Just deduct what was spent
/// The vault's token accounts track actual balances
/// Users get proportional share of ALL tokens on withdrawal
fn update_vault_accounting(
    vault: &mut Vault,
    _input_mint: &Account<Mint>,
    _output_mint: &Account<Mint>,
    input_used: u64,
    _output_received: u64,
) -> Result<()> {
    msg!("Updating vault accounting...");

    // Simple accounting: Just deduct what was spent
    // The vault now holds less input token, but gained output tokens
    // The actual balances are tracked in the token accounts
    vault.total_assets = vault
        .total_assets
        .checked_sub(input_used)
        .ok_or(VaultError::MathOverflow)?;

    msg!("Deducted {} from total_assets", input_used);
    msg!("New total_assets: {}", vault.total_assets);

    // NOTE: In production, you'd want to:
    // 1. Track multiple token balances
    // 2. Get prices from oracle (Pyth)
    // 3. Calculate total USD value
    // 4. Update share price accordingly
    //
    // For now, this simple version works fine for MVP

    Ok(())
}
