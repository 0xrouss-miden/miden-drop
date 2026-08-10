use miden_client::{
    asset::{Asset, FungibleAsset},
    auth::AuthSchemeId,
    crypto::RandomCoin,
    transaction::RawOutputNote,
    Felt, Word,
};
use miden_standards::testing::note::NoteBuilder;
use miden_testing::{Auth, MockChain};

const DROP_AMOUNT: u64 = 250;
const EXPIRATION_BLOCK: u32 = 5;
const DROP_NOTE_SCRIPT: &str = include_str!("../../contracts/drop-note/src/drop_note.masm");

#[tokio::test]
async fn drop_note_without_expiration_can_be_claimed() -> anyhow::Result<()> {
    let mut builder = MockChain::builder();
    let sender = builder.add_existing_wallet(basic_auth())?;
    let recipient = builder.add_existing_wallet(basic_auth())?;
    let drop_note = build_drop_note(sender.id(), 0, [11, 12, 13, 14])?;

    builder.add_output_note(RawOutputNote::Full(drop_note.clone()));
    let mut mock_chain = builder.build()?;
    mock_chain.prove_until_block(10_u32)?;

    let executed_transaction = mock_chain
        .build_tx_context(recipient, &[drop_note.id()], &[])?
        .build()?
        .execute()
        .await?;

    assert_received_amount(&executed_transaction, DROP_AMOUNT);
    Ok(())
}

#[tokio::test]
async fn drop_note_can_be_claimed_before_expiration() -> anyhow::Result<()> {
    let mut builder = MockChain::builder();
    let sender = builder.add_existing_wallet(basic_auth())?;
    let recipient = builder.add_existing_wallet(basic_auth())?;
    let drop_note = build_drop_note(sender.id(), EXPIRATION_BLOCK, [21, 22, 23, 24])?;

    builder.add_output_note(RawOutputNote::Full(drop_note.clone()));
    let mock_chain = builder.build()?;

    let executed_transaction = mock_chain
        .build_tx_context(recipient, &[drop_note.id()], &[])?
        .build()?
        .execute()
        .await?;

    assert_received_amount(&executed_transaction, DROP_AMOUNT);
    Ok(())
}

#[tokio::test]
async fn expired_drop_note_rejects_a_non_sender() -> anyhow::Result<()> {
    let mut builder = MockChain::builder();
    let sender = builder.add_existing_wallet(basic_auth())?;
    let recipient = builder.add_existing_wallet(basic_auth())?;
    let drop_note = build_drop_note(sender.id(), EXPIRATION_BLOCK, [31, 32, 33, 34])?;

    builder.add_output_note(RawOutputNote::Full(drop_note.clone()));
    let mut mock_chain = builder.build()?;
    mock_chain.prove_until_block(EXPIRATION_BLOCK)?;

    let result = mock_chain
        .build_tx_context(recipient, &[drop_note.id()], &[])?
        .build()?
        .execute()
        .await;

    result.expect_err("a non-sender claimed an expired drop note");
    Ok(())
}

#[tokio::test]
async fn sender_can_reclaim_an_expired_drop_note() -> anyhow::Result<()> {
    let mut builder = MockChain::builder();
    let sender = builder.add_existing_wallet(basic_auth())?;
    let drop_note = build_drop_note(sender.id(), EXPIRATION_BLOCK, [41, 42, 43, 44])?;

    builder.add_output_note(RawOutputNote::Full(drop_note.clone()));
    let mut mock_chain = builder.build()?;
    mock_chain.prove_until_block(EXPIRATION_BLOCK)?;

    let executed_transaction = mock_chain
        .build_tx_context(sender, &[drop_note.id()], &[])?
        .build()?
        .execute()
        .await?;

    assert_received_amount(&executed_transaction, DROP_AMOUNT);
    Ok(())
}

fn basic_auth() -> Auth {
    Auth::BasicAuth {
        auth_scheme: AuthSchemeId::Falcon512Poseidon2,
    }
}

fn build_drop_note(
    sender: miden_client::account::AccountId,
    expiration_block: u32,
    rng_seed: [u32; 4],
) -> anyhow::Result<miden_client::note::Note> {
    let asset: Asset = FungibleAsset::mock(DROP_AMOUNT).into();
    let mut note_rng = RandomCoin::new(Word::from(rng_seed));

    Ok(NoteBuilder::new(sender, &mut note_rng)
        .code(DROP_NOTE_SCRIPT)
        .note_storage([Felt::from(expiration_block)])?
        .add_assets([asset])
        .build()?)
}

fn assert_received_amount(
    executed_transaction: &miden_client::transaction::ExecutedTransaction,
    expected_amount: u64,
) {
    let received_asset = executed_transaction
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
