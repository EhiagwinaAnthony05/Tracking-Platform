export function formatAdminDate(dateValue, options = {}) {
  if (!dateValue) {
    return '--'
  }

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) {
    return '--'
  }

  return parsed.toLocaleDateString(undefined, options)
}

export function formatAdminDateTime(dateValue, options = {}) {
  if (!dateValue) {
    return '--'
  }

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) {
    return '--'
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }

  return parsed.toLocaleString(undefined, { ...defaultOptions, ...options })
}