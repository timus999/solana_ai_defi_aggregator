use crate::state::Strategy;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateStrategy<'info> {
    #[account(
        mut,
        constraint = strategy.creator == creator.key()
    )]
    pub strategy: Account<'info, Strategy>,

    pub creator: Signer<'info>,
}

pub fn update_strategy_status(
    ctx: Context<UpdateStrategy>,
    is_active: bool,
    new_price: Option<u64>,
) -> Result<()> {
    let strategy = &mut ctx.accounts.strategy;

    strategy.is_active = is_active;

    if let Some(price) = new_price {
        strategy.price = price;
    }

    msg!("Strategy {} updated by creator", strategy.name);

    Ok(())
}
