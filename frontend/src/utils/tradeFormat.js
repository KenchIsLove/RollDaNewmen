// Compact "Grumpy Cat ×2, Disco Duck" style summary used across trade rows.
// Keeps the long lists on the trade page from blowing up the row height.
export function summarizeItems(items, type, maxNames = 3) {
  const filtered = items.filter(i => i.type === type)
  if (filtered.length === 0) return '—'
  const named = filtered
    .slice(0, maxNames)
    .map(i => (i.count > 1 ? `${i.character_name} ×${i.count}` : i.character_name))
  if (filtered.length > maxNames) {
    named.push(`+${filtered.length - maxNames} more`)
  }
  return named.join(', ')
}

export const STATUS_LABEL = {
  pending:   'Pending',
  accepted:  'Completed',
  declined:  'Declined',
  cancelled: 'Cancelled',
}

export const STATUS_COLOR = {
  pending:   '#f59e42', // orange
  accepted:  '#22c55e', // green
  declined:  '#ef4444', // red
  cancelled: '#8b8b98', // gray
}
