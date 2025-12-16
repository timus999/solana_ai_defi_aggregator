use crate::error::vault_error::VaultError;
use crate::events::vault_events::DepositEvent;
use crate::state::Vault;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
         mut,
         seeds = [b"vault", vault.token_mint.as_ref()],
         bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        constraint = user_token_account.mint == vault.token_mint @ VaultError::MintMismatch,
        constraint = user_token_account.owner == user.key() @ VaultError::InvalidOwner
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault_token_account", vault.key().as_ref()],
        bump,
        constraint = vault_token_account.mint == vault.token_mint @ VaultError::MintMismatch,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = share_mint,
        associated_token::authority = user,

    )]
    pub user_share_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = share_mint.key() == vault.share_mint @ VaultError::MintMismatch,
    )]
    pub share_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, VaultError::ZeroAmount);

    let vault = &mut ctx.accounts.vault;
    let shares_to_mint = vault.assets_to_shares(amount)?;

    msg!("Depositing {} tokens", amount);
    msg!("Minting {} shares", shares_to_mint);

    // Transfer Tokens
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    // Mint Shares
    //
    let seeds = &[b"vault", vault.token_mint.as_ref(), &[vault.bump]];
    let signer_seeds = &[&seeds[..]];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.share_mint.to_account_info(),
                to: ctx.accounts.user_share_account.to_account_info(),
                authority: vault.to_account_info(),
            },
            signer_seeds,
        ),
        shares_to_mint,
    )?;

    // Update State
    vault.total_assets = vault
        .total_assets
        .checked_add(amount)
        .ok_or(VaultError::MathOverflow)?;
    vault.total_shares = vault
        .total_shares
        .checked_add(shares_to_mint)
        .ok_or(VaultError::MathOverflow)?;

    emit!(DepositEvent {
        user: ctx.accounts.user.key(),
        amount,
        shares: shares_to_mint,
        total_assets: vault.total_assets,
        total_shares: vault.total_shares,
        timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
}
