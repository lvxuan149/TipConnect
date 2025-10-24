// Creators 的"声誉关注点"分类（保持与 Discover 的侧边交互一致）
export type FocusKey = 'all' | 'top_tips' | 'most_supporters' | 'most_shared';

export const FOCUS_CATEGORIES: { key: FocusKey; label: string; hint?: string }[] = [
  { key: 'all',             label: 'All Creators' },
  { key: 'top_tips',        label: 'Top Tips' },        // 按 total_tip_value_sol
  { key: 'most_supporters', label: 'Most Supporters' }, // 按 unique_supporters
  { key: 'most_shared',     label: 'Most Shared' },     // 按 share_count
];