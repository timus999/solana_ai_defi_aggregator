use crate::state::GlobalState;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct InitializeFeeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    // Vault PDA token account
    #[account(
        init,
        payer = authority,
        seeds = [b"fee_vault", input_mint.key().as_ref()],
        bump,
        token::mint = input_mint,
        token::authority = global_state,
    )]
    pub vault_ata: Account<'info, TokenAccount>,

    pub input_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_fee_vault(_ctx: Context<InitializeFeeVault>) -> Result<()> {
    msg!("Vault initialized successfully");
    Ok(())
}
