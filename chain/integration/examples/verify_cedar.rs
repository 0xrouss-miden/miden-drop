//! Read-only check of the Cedar mainnet deployments used by the frontend and note script.
use anyhow::{ensure, Context};
use miden_client::{
    account::{AccountId, StorageMapKey, StorageSlotName},
    crypto::Poseidon2,
    rpc::{Endpoint, GrpcClient, NodeRpcClient},
    Felt, ZERO,
};
use miden_standards::account::faucets::FungibleFaucet;

const ORACLE_ID: &str = "0x8f8d747477ca171144feadc60a1137";
const MEDIAN_ROOT: &str = "0x633ac6865a1c4c27f065c07439d59bffdcd931ed9a706abbe2ae70dcd76031ac";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let rpc = GrpcClient::new(
        &Endpoint::new("https".into(), "rpc.cedar.miden.io".into(), None),
        20_000,
    );
    for (hex, symbol, decimals) in [
        ("0xe69e6ca6e39df1b10c1e5399399feb", "USDCX", 6),
        ("0x419f8f4bff72959132aa7cea15a4c1", "ETH", 8),
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

    let slot = |name: &str| StorageSlotName::new(name).map_err(anyhow::Error::from);
    ensure!(
        oracle
            .storage()
            .get_item(&slot("pragma::oracle::paused")?)?[0]
            == ZERO,
        "Pragma is paused"
    );
    let next_index = oracle
        .storage()
        .get_item(&slot("pragma::oracle::next_publisher_index")?)?[0]
        .as_canonical_u64();
    ensure!(
        (3..=258).contains(&next_index),
        "Invalid publisher registry"
    );
    let mut publishers = Vec::new();
    for index in 2..next_index {
        let entry = oracle.storage().get_map_item(
            &slot("pragma::oracle::publishers")?,
            StorageMapKey::new([Felt::new(index)?, ZERO, ZERO, ZERO].into()),
        )?;
        if entry[0] == ZERO && entry[1] == ZERO {
            continue;
        }
        let id = AccountId::new_unchecked([entry[0], entry[1]]);
        publishers.push(
            rpc.get_account_details(id)
                .await?
                .context("Missing publisher")?,
        );
    }
    let (header, _) = rpc.get_block_header_by_number(None, false).await?;
    let pairs_source = include_str!("../../../frontend/lib/miden/price-pairs.ts");
    for pair in ["BTC/USD", "ETH/USD"] {
        let key = Poseidon2::hash(pair.as_bytes());
        ensure!(
            source.contains(&key.to_string()) && pairs_source.contains(&key.to_string()),
            "{pair}: contract/frontend key differs from Pragma's pair-name hash"
        );
        let mut fresh_publishers = 0;
        for publisher in &publishers {
            let entry = publisher.storage().get_map_item(
                &slot("pragma::publisher::entries")?,
                StorageMapKey::new(key),
            )?;
            let [timestamp, decimals, price, _] = entry.map(|felt| felt.as_canonical_u64());
            let now = u64::from(header.timestamp());
            if timestamp <= now && now - timestamp <= 120 && decimals == 8 && price > 0 {
                fresh_publishers += 1;
            }
        }
        ensure!(
            fresh_publishers > 0,
            "{pair}: no fresh eight-decimal publisher price"
        );
        println!("{pair}: {fresh_publishers} fresh publisher(s), key {key} — OK");
    }
    Ok(())
}
