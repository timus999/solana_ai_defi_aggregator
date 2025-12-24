use crate::error::StrategyError;
use crate::state::{strategy::Strategy, StrategyParameters, StrategyType};
use anchor_lang::prelude::*;
// Create Strategy
//

#[derive(Accounts)]
#[instruction(strategy_id: u64)]
pub struct CreateStrategy<'info> {
    #[account(
        init,
        payer = creator,
        space = Strategy::MAX_SIZE,
        seeds = [b"strategy", creator.key().as_ref(), strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_strategy(
    ctx: Context<CreateStrategy>,
    strategy_id: u64,
    name: String,
    description: String,
    price: u64,
    strategy_type: StrategyType,
    parameters: StrategyParameters,
) -> Result<()> {
    require!(name.len() <= 50, StrategyError::NameTooLong);
    require!(description.len() <= 200, StrategyError::DescriptionTooLong);

    let strategy = &mut ctx.accounts.strategy;
    let clock = Clock::get()?;

    strategy.creator = ctx.accounts.creator.key();
    strategy.strategy_id = strategy_id;
    strategy.name = name;
    strategy.description = description;
    strategy.price = price;
    strategy.is_active = true;
    strategy.total_purchases = 0;
    strategy.total_executions = 0;
    strategy.total_profit = 0;
    strategy.success_rate = 0;
    strategy.created_at = clock.unix_timestamp;
    strategy.strategy_type = strategy_type;
    strategy.parameters = parameters;
    strategy.bump = ctx.bumps.strategy;

    msg!(
        "Strategy created : {} by {}",
        strategy.name,
        strategy.creator
    );

    Ok(())
}
