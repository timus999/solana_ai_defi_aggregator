use crate::state::{Strategy, StrategyExecution, UserStrategy};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RecordExecutionResult<'info> {
    #[account(mut)]
    pub strategy: Account<'info, Strategy>,

    #[account(mut)]
    pub user_strategy: Account<'info, UserStrategy>,

    #[account(mut)]
    pub execution: Account<'info, StrategyExecution>,

    pub executor: Signer<'info>,
}

pub fn record_execution_result(
    ctx: Context<RecordExecutionResult>,
    output_amount: u64,
    profit: i64,
    success: bool,
) -> Result<()> {
    let strategy = &mut ctx.accounts.strategy;
    let user_strategy = &mut ctx.accounts.user_strategy;
    let execution = &mut ctx.accounts.execution;

    // Update execution record
    execution.output_amount = output_amount;
    execution.profit = profit;
    execution.success = success;

    // Update strategy stats
    strategy.total_profit += profit;
    user_strategy.total_profit += profit;

    // Update success rate
    if success {
        let total_successes =
            (strategy.success_rate as u64 * (strategy.total_executions - 1)) / 10000;
        strategy.success_rate = ((total_successes + 1) * 10000 / strategy.total_executions) as u16;
    } else {
        let total_successes =
            (strategy.success_rate as u64 * (strategy.total_executions - 1)) / 10000;
        strategy.success_rate = (total_successes * 10000 / strategy.total_executions) as u16;
    }

    msg!(
        "Execution result recorded: profit={}, success={}",
        profit,
        success
    );

    Ok(())
}
