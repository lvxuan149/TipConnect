export type ActionKey = 'all' | 'tip' | 'airdrop' | 'guess' | 'vote' | 'share';

export const ACTION_TYPES: { key: ActionKey; label: string }[] = [
  { key: 'all',     label: 'All Stories' },
  { key: 'tip',     label: 'Tip & Thank' },
  { key: 'airdrop', label: 'Airdrop & Reward' },
  { key: 'guess',   label: 'Guess & Predict' },
  { key: 'vote',    label: 'Vote & Decide' },
  { key: 'share',   label: 'Share & Spread' },
];