use crate::error::vault_error::VaultError;
use crate::events::vault_events::StrategyExecutedEvent;
use crate::instructions::vault::StrategyType;
use crate::state::vault::Vault;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

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

    /// Vault's token account
    #[account(
        mut,
        seeds = [b"vault_token_account", vault.key().as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    // Additional accounts will be passed via remaining_accounts
    // for Jupiter swap integration
}

pub fn execute_strategy(
    ctx: Context<ExecuteStrategy>,
    strategy_type: StrategyType,
    amount: u64,
    min_output: u64,
) -> Result<()> {
    msg!("=== Execute Strategy ===");
    msg!("Strategy type: {:?}", strategy_type);
    msg!("Amount: {}", amount);
    msg!("Min output: {}", min_output);

    let vault = &ctx.accounts.vault;

    require!(vault.total_assets >= amount, VaultError::InsufficientAssets);

    match strategy_type {
        StrategyType::JupiterSwap => {
            msg!("Jupiter swap strategy");
            // TODO: Integrate with jupiter_swap_handler
            // Will be implemented after this stub is working
            msg!("STUB: Would call Jupiter here");
        }
        StrategyType::Rebalance => {
            msg!("Rebalance strategy");
            // TODO: Multi-asset rebalancing
            msg!("STUB: Would rebalance portfolio");
        }
        StrategyType::Yield => {
            msg!("Yield optimization strategy");
            // TODO: Deploy to yield protocols
            msg!("STUB: Would deploy to yield protocols");
        }
    }

    emit!(StrategyExecutedEvent {
        vault: vault.key(),
        strategy_type,
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
