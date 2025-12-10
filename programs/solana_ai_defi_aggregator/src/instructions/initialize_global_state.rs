use crate::state::GlobalState;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(fee_rate: u16)]
pub struct InitializeGlobalState<'info> {
    #[account(
        init,
        seeds = [b"global_state"],
        bump,
        payer = admin,
        space = 8 + GlobalState::LEN,
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_global_state_handler(
    ctx: Context<InitializeGlobalState>,
    fee_rate: u16,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;

    global_state.admin = ctx.accounts.admin.key();
    global_state.fee_rate = fee_rate;
    global_state.bump = ctx.bumps.global_state;

    emit!(GlobalStateInitialized {
        admin: global_state.admin.key(),
        fee_rate: global_state.fee_rate,
    });

    Ok(())
}

#[event]
pub struct GlobalStateInitialized {
    pub admin: Pubkey,
    pub fee_rate: u16,
}
