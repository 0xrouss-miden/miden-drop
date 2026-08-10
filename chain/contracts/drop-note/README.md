# Miden Drop note

`src/drop_note.masm` defines the private bearer note used by Miden Drop.

The note has no target account in storage. Before expiration, anyone who possesses the complete
private note data can consume it, and the script transfers every asset in the note to the consuming
account through Miden's standard Basic Wallet interface.

The note stores one value, `expiration_block`:

- `0` disables expiration.
- A non-zero block height makes the note claimable only by its original sender from that block
  onward. Recovery is not automatic; the sender must consume the expired note in a transaction.

The private note data is therefore bearer authorization and must only be shared with the intended
recipient. Block height, rather than wall-clock time, is the consensus value enforced by the note
script. The frontend integration that creates and transports this data is intentionally out of scope
for this phase.
