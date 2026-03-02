use anchor_lang::prelude::*;

declare_id!("TRun1111111111111111111111111111111111111111");

#[program]
pub mod territory_proof {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, authority: Pubkey) -> Result<()> {
        let store = &mut ctx.accounts.proof_store;
        store.authority = authority;
        store.total_proofs = 0;
        store.bump = ctx.bumps.proof_store;
        msg!("TerritoryRun ProofStore initialized. Authority: {}", authority);
        Ok(())
    }

    pub fn write_daily_proof(
        ctx: Context<WriteDailyProof>,
        date_str: String,
        merkle_root: [u8; 32],
        total_users: u32,
        total_hexes: u64,
        total_runs: u32,
    ) -> Result<()> {
        require!(date_str.len() == 10, ErrorCode::InvalidDateFormat);
        require!(
            ctx.accounts.proof_store.authority == *ctx.accounts.authority.key,
            ErrorCode::Unauthorized
        );

        let proof = &mut ctx.accounts.daily_proof;
        proof.date_str = date_str.clone();
        proof.merkle_root = merkle_root;
        proof.total_users = total_users;
        proof.total_hexes = total_hexes;
        proof.total_runs = total_runs;
        proof.written_at = Clock::get()?.unix_timestamp;
        proof.authority = *ctx.accounts.authority.key;
        proof.bump = ctx.bumps.daily_proof;

        ctx.accounts.proof_store.total_proofs += 1;

        msg!(
            "Proof written: date={} users={} hexes={} runs={}",
            date_str,
            total_users,
            total_hexes,
            total_runs
        );
        Ok(())
    }

    pub fn verify_proof(ctx: Context<VerifyProof>, _date_str: String) -> Result<()> {
        let proof = &ctx.accounts.daily_proof;
        msg!(
            "Verified: date={} users={} hexes={} written_at={}",
            proof.date_str,
            proof.total_users,
            proof.total_hexes,
            proof.written_at
        );
        Ok(())
    }
}

#[account]
pub struct ProofStore {
    pub authority: Pubkey,
    pub total_proofs: u64,
    pub bump: u8,
}

#[account]
pub struct DailyProof {
    pub date_str: String,
    pub merkle_root: [u8; 32],
    pub total_users: u32,
    pub total_hexes: u64,
    pub total_runs: u32,
    pub written_at: i64,
    pub authority: Pubkey,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 8 + 1,
        seeds = [b"proof_store"],
        bump
    )]
    pub proof_store: Account<'info, ProofStore>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(date_str: String)]
pub struct WriteDailyProof<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 14 + 32 + 4 + 4 + 8 + 4 + 8 + 32 + 1,
        seeds = [b"daily_proof", date_str.as_bytes()],
        bump
    )]
    pub daily_proof: Account<'info, DailyProof>,
    #[account(mut, seeds = [b"proof_store"], bump = proof_store.bump)]
    pub proof_store: Account<'info, ProofStore>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(date_str: String)]
pub struct VerifyProof<'info> {
    #[account(seeds = [b"daily_proof", date_str.as_bytes()], bump = daily_proof.bump)]
    pub daily_proof: Account<'info, DailyProof>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Date string must be exactly 10 characters: YYYY-MM-DD")]
    InvalidDateFormat,
    #[msg("Only the authority wallet can write proofs")]
    Unauthorized,
}
