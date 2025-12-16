use crate::error::vault_error::VaultError;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    /// Authority that can execute strategies
    pub authority: Pubkey,

    /// The underlying token the vault accepts (e.g., USDC)
    pub token_mint: Pubkey,

    /// The share token mint (vault shares)
    pub share_mint: Pubkey,

    /// Total underlying tokens in the vault
    pub total_assets: u64,

    /// Total shares issued
    pub total_shares: u64,

    /// Bump for PDA
    pub bump: u8,

    /// Strategy enabled flag
    pub strategy_enabled: bool,

    /// Performance fee in basis points (e.g., 1000 = 10%)
    pub performance_fee_bps: u16,
}

impl Vault {
    /// Calculate share price: assets / shares
    pub fn share_price(&self) -> Result<u64> {
        if self.total_shares == 0 {
            return Ok(1_000_000); // Initial price: 1.0 (with 6 decimals)
        }

        // Price = (total_assets * 1e6) / total_shares
        let price = (self.total_assets as u128)
            .checked_mul(1_000_000)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(self.total_shares as u128)
            .ok_or(VaultError::MathOverflow)?;

        require!(price <= u64::MAX as u128, VaultError::MathOverflow);

        Ok(price as u64)
    }

    /// Convert assets to shares
    pub fn assets_to_shares(&self, assets: u64) -> Result<u64> {
        if self.total_shares == 0 {
            // Initial deposit: 1:1 ratio
            return Ok(assets);
        }

        // shares = (assets * total_shares) / total_assets
        let shares = (assets as u128)
            .checked_mul(self.total_shares as u128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(self.total_assets as u128)
            .ok_or(VaultError::MathOverflow)?;

        require!(shares <= u64::MAX as u128, VaultError::MathOverflow);
        require!(shares > 0, VaultError::ZeroShares);

        Ok(shares as u64)
    }

    /// Convert shares to assets
    pub fn shares_to_assets(&self, shares: u64) -> Result<u64> {
        require!(shares > 0, VaultError::ZeroShares);
        require!(self.total_shares > 0, VaultError::NoShares);

        // assets = (shares * total_assets) / total_shares
        let assets = (shares as u128)
            .checked_mul(self.total_assets as u128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(self.total_shares as u128)
            .ok_or(VaultError::MathOverflow)?;

        require!(assets <= u64::MAX as u128, VaultError::MathOverflow);
        require!(assets > 0, VaultError::ZeroAssets);

        Ok(assets as u64)
    }
}
