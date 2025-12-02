use crate::state::SwapContext;
use crate::state::UserState;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(amount_in: u64, amount_out_min: u64)]
pub struct ExecuteSwap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user_state.bump
    )]
    pub user_state: Account<'info, UserState>,

    #[account(
        init,
        seeds = [
            b"swap",
            user.key().as_ref(),
            &user_state.swaps.to_le_bytes()
        ],
        bump,
        payer = user,
        space = 8 + SwapContext::LEN
    )]
    pub swap_context: Account<'info, SwapContext>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ExecuteSwap>,
    amount_in: u64,
    min_amount_out: u64,
    input_mint: Pubkey,
    output_mint: Pubkey,
) -> Result<()> {
    let user_state = &mut ctx.accounts.user_state;
    let swap = &mut ctx.accounts.swap_context;

    let swap_id = user_state.swaps;

    swap.user = ctx.accounts.user.key();
    swap.input_mint = input_mint;
    swap.output_mint = output_mint;
    swap.amount_in = amount_in;
    swap.min_amount_out = min_amount_out;
    swap.timestamp = Clock::get()?.unix_timestamp;
    swap.bump = ctx.bumps.swap_context;

    // update user stats
    user_state.total_volume += amount_in;
    user_state.swaps += 1;

    emit!(SwapEvent {
        user: ctx.accounts.user.key(),
        amount_in,
        input_mint,
        output_mint,
        swap_id,
        timestamp: swap.timestamp,
    });

    Ok(())
}

#[event]
pub struct SwapEvent {
    pub user: Pubkey,
    pub amount_in: u64,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub swap_id: u64,
    pub timestamp: i64,
}
