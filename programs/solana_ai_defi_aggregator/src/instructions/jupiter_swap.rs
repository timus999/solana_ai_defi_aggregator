use crate::state::GlobalState;
use crate::state::UserState;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Clone)]
pub struct Jupiter;

impl anchor_lang::Id for Jupiter {
    fn id() -> Pubkey {
        "JUP6LkbZGqvWuCdgZ2zVZgY3BGDScGJ".parse().unwrap()
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
