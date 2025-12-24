use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::StrategyError;
use crate::state::{Strategy, UserStrategy};

#[derive(Accounts)]
pub struct BuyStrategy<'info> {
    #[account(mut)]
    pub strategy: Account<'info, Strategy>,

    #[account(
        init,
        payer = buyer,
        space = UserStrategy::MAX_SIZE,
        seeds = [b"user_strategy", buyer.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_strategy: Account<'info, UserStrategy>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub creator: SystemAccount<'info>,

    // Payment in USDC
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_strategy(ctx: Context<BuyStrategy>) -> Result<()> {
    let strategy = &mut ctx.accounts.strategy;

    require!(strategy.is_active, StrategyError::StrategyInactive);
    require!(strategy.price > 0, StrategyError::InvalidPrice);

    // Transfer USDC from buyer to creator
    let cpi_accounts = Transfer {
        from: ctx.accounts.buyer_token_account.to_account_info(),
        to: ctx.accounts.creator_token_account.to_account_info(),
        authority: ctx.accounts.buyer.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, strategy.price)?;

    // Update strategy stats
    strategy.total_purchases = strategy.total_purchases.checked_add(1).unwrap_or(0);

    // Create user strategy record
    //
    let user_strategy = &mut ctx.accounts.user_strategy;
    let clock = Clock::get()?;

    user_strategy.owner = ctx.accounts.buyer.key();
    user_strategy.strategy = strategy.key();
    user_strategy.purchased_at = clock.unix_timestamp;
    user_strategy.times_executed = 0;
    user_strategy.total_profit = 0;
    user_strategy.bump = ctx.bumps.user_strategy;

    msg!(
        "Strategy {} purchased by {}",
        strategy.name,
        ctx.accounts.buyer.key()
    );

    Ok(())
}
