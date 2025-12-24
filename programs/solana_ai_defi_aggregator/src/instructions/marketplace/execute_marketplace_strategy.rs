use crate::state::{Strategy, StrategyExecution, UserStrategy, Vault};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

#[derive(Accounts)]
pub struct ExecuteStrategy<'info> {
    #[account(mut)]
    pub strategy: Account<'info, Strategy>,

    #[account(
        mut,
        seeds = [b"user_strategy", executor.key().as_ref(), strategy.key().as_ref()],
        bump = user_strategy.bump,
        constraint = user_strategy.owner == executor.key()
    )]
    pub user_strategy: Account<'info, UserStrategy>,

    #[account(mut)]
    pub executor: Signer<'info>,

    #[account(
        init,
        payer = executor,
        space = StrategyExecution::MAX_SIZE,
        seeds = [b"execution", strategy.key().as_ref(), strategy.total_executions.to_le_bytes().as_ref()],
        bump
    )]
    pub execution: Account<'info, StrategyExecution>,

    // Vault accounts for strategy execution
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn execute_strategy(ctx: Context<ExecuteStrategy>, input_amount: u64) -> Result<()> {
    let strategy = &mut ctx.accounts.strategy;
    let user_strategy = &mut ctx.accounts.user_strategy;
    let execution = &mut ctx.accounts.execution;
    let clock = Clock::get()?;

    // For manual execution, user provides the results
    // In Week 3, AI agents will actually execute the swaps

    // Record execution
    execution.strategy = strategy.key();
    execution.executor = ctx.accounts.executor.key();
    execution.executed_at = clock.unix_timestamp;
    execution.input_amount = input_amount;
    execution.output_amount = 0; // Will be set after swap
    execution.profit = 0; // Will be calculated
    execution.success = false; // Will be updated
    execution.bump = ctx.bumps.execution;

    // Update counters
    strategy.total_executions = strategy.total_executions.checked_add(1).unwrap_or(0);
    user_strategy.times_executed = user_strategy.times_executed.checked_add(1).unwrap_or(0);

    msg!(
        "Strategy {} executed by {}",
        strategy.name,
        ctx.accounts.executor.key()
    );

    Ok(())
}
