# Contract

## Entities
- Story: canonical record that groups all content, actions, and payouts under a single narrative entry.
- BlinkAction: on-chain or in-app action emitted from a Blink; every BlinkAction references the Story it belongs to.
- Creator (Host): owner of the Story who issues Blinks and receives aggregated reporting for their Story.
- Events: `tip`, `airdrop`, `guess`, `vote`, `share`; events are emitted per BlinkAction.

## Constraints
- Uniqueness: `(tx_signature, type)` is the composite key for every BlinkAction event.
- `story_id`: required on all BlinkAction and event records; every Blink must attach to an existing Story.

## Amounts & Time
- Amount unit: `SOL` with 9 decimal precision.
- Time: Unix millisecond timestamps.

Any change here must be accompanied by migration + seed + tests updates.
