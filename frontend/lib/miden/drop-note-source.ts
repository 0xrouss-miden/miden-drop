// Browser copy of chain/contracts/drop-note/src/drop_note.masm.
// The parity test fails if the canonical contract changes without updating this bundle.
export const DROP_NOTE_SOURCE = `use miden::protocol::active_account
use miden::protocol::account_id
use miden::protocol::active_note
use miden::protocol::tx
use miden::standards::wallets::basic->basic_wallet

const ERR_DROP_NOTE_UNEXPECTED_STORAGE="Miden Drop price note expects exactly four storage items"
const ERR_DROP_NOTE_INVALID_EXPIRATION="Miden Drop price note requires a recovery block"
const ERR_DROP_NOTE_INVALID_PAIR="Miden Drop price note only supports BTC/USD and ETH/USD"
const ERR_DROP_NOTE_INVALID_TARGET="Miden Drop price note requires a non-zero target price"
const ERR_DROP_NOTE_SENDER_LOCKED="Miden Drop sender cannot claim before the recovery block"
const ERR_DROP_NOTE_RECIPIENT_EXPIRED="Miden Drop expired and can only be reclaimed by its sender"
const ERR_DROP_NOTE_PRICE_UNAVAILABLE="Pragma pair is not tracked or has no fresh publisher value"
const ERR_DROP_NOTE_PRICE_TOO_LOW="Pragma price has not reached the Miden Drop target"

#! Miden Drop price-gated bearer note.
#!
#! Before the recovery block, a non-sender bearer may consume the note only when Pragma's current
#! BTC/USD or ETH/USD median is greater than or equal to the configured raw target price. At and
#! after the recovery block, the Oracle is skipped and only the original sender may recover it.
#!
#! Pragma deployment pinned by this script:
#! - Oracle: 0x7ad4aa02b1816c117e32853e210c28
#! - get_median: 0xaa3a12d4e9de2dad37c50dba93809b9c17226d512e642d3d620c77088a85da71
#!
#! Requires the consuming account to expose the standard Basic Wallet \`receive_asset\` procedure.
#!
#! Note storage:
#! - recovery_block: block height from which only the sender may consume the note.
#! - pair_prefix: 1 for BTC/USD or 2 for ETH/USD.
#! - pair_suffix: 0 for both supported pairs.
#! - raw_target_price: USD target scaled by 10^8.
#!
#! Inputs:  []
#! Outputs: []
@note_script
pub proc claim
    # Load the four immutable wager parameters into memory addresses 0..3.
    push.0 exec.active_note::get_storage
    eq.4 assert.err=ERR_DROP_NOTE_UNEXPECTED_STORAGE

    # Every price-gated drop must eventually become recoverable.
    mem_load.0 eq.0 assertz.err=ERR_DROP_NOTE_INVALID_EXPIRATION

    # Only BTC/USD (1:0) and ETH/USD (2:0) are supported by this script.
    mem_load.2 eq.0 assert.err=ERR_DROP_NOTE_INVALID_PAIR
    mem_load.1 dup eq.1 swap eq.2 or assert.err=ERR_DROP_NOTE_INVALID_PAIR

    # A zero threshold would make the price condition meaningless.
    mem_load.3 eq.0 assertz.err=ERR_DROP_NOTE_INVALID_TARGET

    # The recovery block is an exclusive boundary: recipient before, sender from it onward.
    mem_load.0 exec.tx::get_block_number lte
    if.true
        exec.active_account::get_id
        exec.active_note::get_sender
        exec.account_id::is_equal assert.err=ERR_DROP_NOTE_RECIPIENT_EXPIRED
    else
        # The creating account is explicitly locked out during the recipient claim window.
        exec.active_account::get_id
        exec.active_note::get_sender
        exec.account_id::is_equal assertz.err=ERR_DROP_NOTE_SENDER_LOCKED

        # Pragma get_median inputs: [pair_prefix, pair_suffix, amount=0, reserved=0, pad(12)].
        padw padw padw
        push.0.0 mem_load.2 mem_load.1

        # Select Pragma get_median and its deployed public Oracle account.
        push.0xaa3a12d4e9de2dad37c50dba93809b9c17226d512e642d3d620c77088a85da71
        push.8850886096234572817.9093477099503364096
        exec.tx::execute_foreign_procedure

        # Outputs begin [is_tracked, median_price, amount=0, pad(13)].
        push.1 assert_eq.err=ERR_DROP_NOTE_PRICE_UNAVAILABLE

        # \`lte\` compares the second felt to the first, so [median, target] proves target <= median.
        mem_load.3 swap lte assert.err=ERR_DROP_NOTE_PRICE_TOO_LOW

        # Remove the fourteen unused padded outputs left by the FPI call.
        dropw dropw dropw drop drop
    end

    exec.basic_wallet::add_assets_to_account
end
`;
