use crate::error::vault_error::VaultError;
use crate::state::vault::Vault;
use anchor_lang::prelude::*;

pub fn test_increase_assets(ctx: Context<TestIncreaseAssets>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    vault.total_assets = vault
        .total_assets
        .checked_add(amount)
        .ok_or(VaultError::MathOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct TestIncreaseAssets<'info> {
    #[account(

        mut,
         seeds = [b"vault", vault.token_mint.as_ref()],
         bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    pub authority: Signer<'info>,
}
