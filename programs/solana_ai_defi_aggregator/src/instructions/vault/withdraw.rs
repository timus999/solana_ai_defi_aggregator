use crate::error::vault_error::VaultError;
use crate::events::vault_events::WithdrawEvent;
use crate::state::vault::Vault;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault.token_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    /// User's token account (receives withdrawal)
    #[account(
        mut,
        constraint = user_token_account.mint == vault.token_mint @ VaultError::MintMismatch,
        constraint = user_token_account.owner == user.key() @ VaultError::InvalidOwner,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Vault's token account (source of withdrawal)
    #[account(
        mut,
        seeds = [b"vault_token_account", vault.key().as_ref()],
        bump,
        constraint = vault_token_account.mint == vault.token_mint @ VaultError::MintMismatch,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// User's share token account (shares to burn)
    #[account(
        mut,
        constraint = user_share_account.mint == vault.share_mint @ VaultError::MintMismatch,
        constraint = user_share_account.owner == user.key() @ VaultError::InvalidOwner,
    )]
    pub user_share_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = share_mint.key() == vault.share_mint @ VaultError::MintMismatch,
    )]
    pub share_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
    require!(shares > 0, VaultError::ZeroShares);

    let vault = &mut ctx.accounts.vault;

    // calculate assets to return
    let assets_to_return = vault.shares_to_assets(shares)?;

    // verify vault has enough assets
    require!(
        vault.total_assets >= assets_to_return,
        VaultError::InsufficientAssets
    );

    msg!("Burning {} shares", shares);
    msg!("Returning {} tokens", assets_to_return);
    msg!("Share price: {}", vault.share_price()?);

    // Burn user's shares
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.share_mint.to_account_info(),
                from: ctx.accounts.user_share_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        shares,
    )?;

    // Transfer tokens from vault to user
    // let vault_key = vault.key();
    let seed = &[b"vault", vault.token_mint.as_ref(), &[vault.bump]];

    let signer_seeds = &[&seed[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: vault.to_account_info(),
            },
            signer_seeds,
        ),
        assets_to_return,
    )?;

    // Update vault state

    vault.total_assets = vault
        .total_assets
        .checked_sub(assets_to_return)
        .ok_or(VaultError::MathOverflow)?;
    vault.total_shares = vault
        .total_shares
        .checked_sub(shares)
        .ok_or(VaultError::MathOverflow)?;

    emit!(WithdrawEvent {
        user: ctx.accounts.user.key(),
        shares,
        amount: assets_to_return,
        total_assets: vault.total_assets,
        total_shares: vault.total_shares,
        timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
}
