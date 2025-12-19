use crate::events::swap_events::UserRegistered;
use crate::state::UserState;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        init,
        seeds = [b"user", user.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + UserState::LEN,
    )]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: PDA
    pub user: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn register_user_handler(ctx: Context<RegisterUser>) -> Result<()> {
    let state = &mut ctx.accounts.user_state;

    state.user = ctx.accounts.user.key();
    state.total_volume = 0;
    state.swaps = 0;
    state.bump = ctx.bumps.user_state;

    emit!(UserRegistered {
        user: ctx.accounts.user.key(),
    });

    Ok(())
}
