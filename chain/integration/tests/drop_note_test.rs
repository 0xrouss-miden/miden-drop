use std::sync::Arc;

use miden_client::{
    account::{component::AccountComponentMetadata, AccountComponent, AccountId},
    assembly::{CodeBuilder, DefaultSourceManager},
    asset::{Asset, FungibleAsset},
    auth::AuthSchemeId,
    crypto::RandomCoin,
    transaction::{ExecutedTransaction, RawOutputNote},
    Felt, Word,
};
use miden_standards::testing::note::NoteBuilder;
use miden_testing::{Auth, MockChain};

const DROP_AMOUNT: u64 = 250;
const RECOVERY_BLOCK: u32 = 5;
const BTC_USD_PREFIX: u64 = 1;
const ETH_USD_PREFIX: u64 = 2;
const USD_SUFFIX: u64 = 0;
const BTC_PRICE: u64 = 6_600_000_000_000;
const ETH_PRICE: u64 = 210_000_000_000;
const BTC_TARGET: u64 = 6_500_000_000_000;
const ETH_TARGET: u64 = 200_000_000_000;

const PRAGMA_ORACLE_ID: &str = "0x7ad4aa02b1816c117e32853e210c28";
const PRAGMA_ORACLE_PREFIX: &str = "8850886096234572817";
const PRAGMA_ORACLE_SUFFIX: &str = "9093477099503364096";
const PRAGMA_GET_MEDIAN_ROOT: &str =
    "0xaa3a12d4e9de2dad37c50dba93809b9c17226d512e642d3d620c77088a85da71";
const DROP_NOTE_SCRIPT: &str = include_str!("../../contracts/drop-note/src/drop_note.masm");

#[derive(Clone, Copy)]
enum Consumer {
    Sender,
    Recipient,
}

#[test]
fn pinned_pragma_oracle_felts_match_account_id_encoding() -> anyhow::Result<()> {
    let oracle_id = AccountId::from_hex(PRAGMA_ORACLE_ID)?;

    assert_eq!(
        oracle_id.prefix().as_felt().as_canonical_u64().to_string(),
        PRAGMA_ORACLE_PREFIX,
    );
    assert_eq!(
        oracle_id.suffix().as_canonical_u64().to_string(),
        PRAGMA_ORACLE_SUFFIX,
    );
    assert_eq!(oracle_id.suffix().as_canonical_u64() & 0xff, 0);

    Ok(())
}

#[tokio::test]
async fn recipient_can_claim_btc_drop_at_or_above_target() -> anyhow::Result<()> {
    let tx = execute_price_drop(
        Consumer::Recipient,
        0,
        BTC_USD_PREFIX,
        USD_SUFFIX,
        BTC_TARGET,
        true,
    )
    .await?;

    assert_received_amount(&tx, DROP_AMOUNT);
    Ok(())
}

#[tokio::test]
async fn recipient_can_claim_without_oracle_condition() -> anyhow::Result<()> {
    let tx = execute_price_drop(Consumer::Recipient, 0, 0, 0, 0, false).await?;

    assert_received_amount(&tx, DROP_AMOUNT);
    Ok(())
}

#[tokio::test]
async fn recipient_can_claim_eth_drop_at_or_above_target() -> anyhow::Result<()> {
    let tx = execute_price_drop(
        Consumer::Recipient,
        0,
        ETH_USD_PREFIX,
        USD_SUFFIX,
        ETH_TARGET,
        true,
    )
    .await?;

    assert_received_amount(&tx, DROP_AMOUNT);
    Ok(())
}

#[tokio::test]
async fn recipient_can_claim_when_price_equals_target() -> anyhow::Result<()> {
    let tx = execute_price_drop(
        Consumer::Recipient,
        0,
        BTC_USD_PREFIX,
        USD_SUFFIX,
        BTC_PRICE,
        true,
    )
    .await?;

    assert_received_amount(&tx, DROP_AMOUNT);
    Ok(())
}

#[tokio::test]
async fn recipient_cannot_claim_below_target() {
    let result = execute_price_drop(
        Consumer::Recipient,
        0,
        BTC_USD_PREFIX,
        USD_SUFFIX,
        BTC_PRICE + 1,
        true,
    )
    .await;

    result.expect_err("a recipient claimed before BTC reached the target");
}

#[tokio::test]
async fn unsupported_pair_is_rejected_before_oracle_execution() {
    let result = execute_price_drop(Consumer::Recipient, 0, 3, USD_SUFFIX, BTC_TARGET, false).await;

    result.expect_err("a recipient claimed a pair outside the BTC/ETH allowlist");
}

#[tokio::test]
async fn partial_oracle_condition_is_rejected() {
    let result = execute_price_drop(Consumer::Recipient, 0, 0, 0, BTC_TARGET, false).await;

    result.expect_err("a partially configured Oracle condition was accepted");
}

#[tokio::test]
async fn sender_cannot_claim_before_recovery_block() {
    let result = execute_price_drop(
        Consumer::Sender,
        0,
        BTC_USD_PREFIX,
        USD_SUFFIX,
        BTC_TARGET,
        false,
    )
    .await;

    result.expect_err("the sender claimed before the recovery block");
}

#[tokio::test]
async fn expired_drop_rejects_non_sender_without_calling_oracle() {
    let result = execute_price_drop(
        Consumer::Recipient,
        RECOVERY_BLOCK,
        BTC_USD_PREFIX,
        USD_SUFFIX,
        BTC_TARGET,
        false,
    )
    .await;

    result.expect_err("a non-sender claimed at the recovery block");
}

#[tokio::test]
async fn sender_can_recover_at_recovery_block_without_oracle() -> anyhow::Result<()> {
    let tx = execute_price_drop(
        Consumer::Sender,
        RECOVERY_BLOCK,
        0,
        0,
        0,
        false,
    )
    .await?;

    assert_received_amount(&tx, DROP_AMOUNT);
    Ok(())
}

async fn execute_price_drop(
    consumer: Consumer,
    current_block: u32,
    pair_prefix: u64,
    pair_suffix: u64,
    raw_target_price: u64,
    include_oracle_inputs: bool,
) -> anyhow::Result<ExecutedTransaction> {
    let mut builder = MockChain::builder();
    let sender = builder.add_existing_wallet(basic_auth())?;
    let recipient = builder.add_existing_wallet(basic_auth())?;

    let source_manager = Arc::new(DefaultSourceManager::default());
    let oracle_component = mock_oracle_component(source_manager.clone())?;
    let get_median_root = oracle_component
        .component_code()
        .procedure_roots()
        .next()
        .expect("mock Oracle should export get_median");
    let oracle =
        builder.add_existing_account_from_components(Auth::IncrNonce, [oracle_component])?;

    let note_script =
        render_drop_note_script(oracle.id(), &get_median_root.mast_root().to_string());
    let drop_note = build_drop_note(
        sender.id(),
        &note_script,
        RECOVERY_BLOCK,
        pair_prefix,
        pair_suffix,
        raw_target_price,
    )?;
    builder.add_output_note(RawOutputNote::Full(drop_note.clone()));

    let mut mock_chain = builder.build()?;
    if current_block > 0 {
        mock_chain.prove_until_block(current_block)?;
    }

    let foreign_inputs = include_oracle_inputs
        .then(|| mock_chain.get_foreign_account_inputs(oracle.id()))
        .transpose()?;
    let consumer_id = match consumer {
        Consumer::Sender => sender.id(),
        Consumer::Recipient => recipient.id(),
    };
    let mut tx_builder = mock_chain.build_tx_context(consumer_id, &[drop_note.id()], &[])?;
    if let Some(foreign_inputs) = foreign_inputs {
        tx_builder = tx_builder.foreign_accounts([foreign_inputs]);
    }

    tx_builder
        .with_source_manager(source_manager)
        .build()?
        .execute()
        .await
        .map_err(Into::into)
}

fn mock_oracle_component(
    source_manager: Arc<DefaultSourceManager>,
) -> anyhow::Result<AccountComponent> {
    let source = format!(
        r#"
        use miden::core::sys

        pub proc get_median
            # Select a deterministic eight-decimal price from the requested pair prefix.
            dup eq.{BTC_USD_PREFIX}
            if.true
                dropw dropw dropw dropw
                padw padw padw push.0.0.{BTC_PRICE}.1
            else
                dup eq.{ETH_USD_PREFIX}
                if.true
                    dropw dropw dropw dropw
                    padw padw padw push.0.0.{ETH_PRICE}.1
                else
                    dropw dropw dropw dropw
                    padw padw padw push.0.0.0.0
                end
            end

            exec.sys::truncate_stack
        end
        "#,
    );
    let code = CodeBuilder::with_source_manager(source_manager)
        .compile_component_code("test::price_oracle", &source)?;

    Ok(AccountComponent::new(
        code,
        vec![],
        AccountComponentMetadata::mock("test::price_oracle"),
    )?)
}

fn render_drop_note_script(oracle_id: AccountId, get_median_root: &str) -> String {
    DROP_NOTE_SCRIPT
        .replace(PRAGMA_GET_MEDIAN_ROOT, get_median_root)
        .replace(
            PRAGMA_ORACLE_PREFIX,
            &oracle_id.prefix().as_felt().as_canonical_u64().to_string(),
        )
        .replace(
            PRAGMA_ORACLE_SUFFIX,
            &oracle_id.suffix().as_canonical_u64().to_string(),
        )
}

fn basic_auth() -> Auth {
    Auth::BasicAuth {
        auth_scheme: AuthSchemeId::Falcon512Poseidon2,
    }
}

fn build_drop_note(
    sender: AccountId,
    note_script: &str,
    recovery_block: u32,
    pair_prefix: u64,
    pair_suffix: u64,
    raw_target_price: u64,
) -> anyhow::Result<miden_client::note::Note> {
    let asset: Asset = FungibleAsset::mock(DROP_AMOUNT).into();
    let mut note_rng = RandomCoin::new(Word::from([11_u32, 12, 13, 14]));

    Ok(NoteBuilder::new(sender, &mut note_rng)
        .code(note_script)
        .note_storage([
            Felt::from(recovery_block),
            Felt::new(pair_prefix)?,
            Felt::new(pair_suffix)?,
            Felt::new(raw_target_price)?,
        ])?
        .add_assets([asset])
        .build()?)
}

fn assert_received_amount(tx: &ExecutedTransaction, expected_amount: u64) {
    let received_asset = tx
        .account_delta()
        .vault()
        .added_assets()
        .next()
        .expect("the consuming wallet should contain the note asset");

    let Asset::Fungible(received_asset) = received_asset else {
        panic!("the received asset should be fungible");
    };
    assert_eq!(received_asset.amount().as_u64(), expected_amount);
}
