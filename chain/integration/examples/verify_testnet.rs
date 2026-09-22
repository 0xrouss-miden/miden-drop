//! Read-only check of the v0.16 deployments used by the frontend and note script.
use anyhow::{ensure, Context};
use miden_client::{
    account::AccountId,
    rpc::{Endpoint, GrpcClient, NodeRpcClient},
};
use miden_standards::account::faucets::FungibleFaucet;

const ORACLE_ID: &str = "0x3b306d819a19b691205480e1619b5c";
const MEDIAN_ROOT: &str = "0xab62a61417fb6c1edc191d24b6a3cc53b2071e671d7013ddd26860267b960b29";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let rpc = GrpcClient::new(&Endpoint::testnet(), 20_000);
    for (hex, symbol, decimals) in [
        ("0x18101fa522c174b165efd4f70a0385", "MIDEN", 6),
        ("0x537c15a622074e91188aa894456c52", "USDC", 6),
        ("0x0b372f2735e33e91216d995bf29b91", "ETH", 8),
    ] {
        let account = rpc
            .get_account_details(AccountId::from_hex(hex)?)
            .await?
            .with_context(|| format!("Missing public faucet: {hex}"))?;
        let faucet = FungibleFaucet::try_from(account.storage())?;
        ensure!(
            faucet.symbol().to_string() == symbol,
            "Unexpected symbol for {hex}"
        );
        ensure!(
            faucet.decimals() == decimals,
            "Unexpected decimals for {hex}"
        );
        println!("{symbol}: {hex}, {decimals} decimals — OK");
    }

    let oracle = rpc
        .get_account_details(AccountId::from_hex(ORACLE_ID)?)
        .await?
        .context("Missing public Pragma Oracle")?;
    ensure!(
        oracle
            .code()
            .procedures()
            .iter()
            .any(|p| p.mast_root().to_string() == MEDIAN_ROOT),
        "Pragma get_median has changed; update the pinned note script and frontend"
    );
    let source = include_str!("../../contracts/drop-note/src/drop_note.masm");
    let frontend = include_str!("../../../frontend/lib/miden/oracle.ts");
    ensure!(
        source.contains(ORACLE_ID) && source.contains(MEDIAN_ROOT),
        "Contract pins differ"
    );
    ensure!(
        frontend.contains(ORACLE_ID) && frontend.contains(MEDIAN_ROOT),
        "Frontend pins differ"
    );
    println!("Pragma: {ORACLE_ID}, get_median {MEDIAN_ROOT} — OK");
    Ok(())
}
