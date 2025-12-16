use crate::error::vault_error::VaultError;
use crate::state::Vault;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The vault state PDA
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", token_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    /// The underlying token mint (e.g, USDC)
    pub token_mint: Account<'info, Mint>,

    /// Share token mint (created by vault)
    #[account(
        init,
        payer = authority,
        mint::decimals = token_mint.decimals,
        mint::authority = vault,
        seeds = [b"share_mint", vault.key().as_ref()],
        bump
    )]
    pub share_mint: Account<'info, Mint>,

    /// Vault's token account (holds underlying assets)
    #[account(
        init,
        payer = authority,
        seeds = [b"vault_token_account", vault.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_vault(ctx: Context<InitializeVault>, performance_fee_bps: u16) -> Result<()> {
    require!(
        performance_fee_bps <= 5000, // Max 50%
        VaultError::InvalidFee
    );

    let vault = &mut ctx.accounts.vault;
    vault.authority = ctx.accounts.authority.key();
    vault.token_mint = ctx.accounts.token_mint.key();
    vault.share_mint = ctx.accounts.share_mint.key();
    vault.total_assets = 0;
    vault.total_shares = 0;
    vault.bump = ctx.bumps.vault;
    vault.strategy_enabled = false;
    vault.performance_fee_bps = performance_fee_bps;

    msg!(
        "Vault initialized for mint: {}",
        ctx.accounts.token_mint.key()
    );
    msg!("Performance fee: {} bps", performance_fee_bps);

    Ok(())
}
