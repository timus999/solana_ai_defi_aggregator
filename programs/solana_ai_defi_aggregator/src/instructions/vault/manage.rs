use crate::error::vault_error::VaultError;
use crate::state::vault::Vault;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SetStrategyEnabled<'info> {
    #[account(
        constraint = authority.key() == vault.authority @ VaultError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.token_mint.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,
}

pub fn set_strategy_enabled(ctx: Context<SetStrategyEnabled>, enabled: bool) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.strategy_enabled = enabled;

    msg!("Strategy enabled: {}", enabled);
    Ok(())
}
