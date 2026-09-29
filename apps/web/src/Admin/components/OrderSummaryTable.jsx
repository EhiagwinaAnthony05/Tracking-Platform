import { formatAdminDate } from '../utils/formatDate'
import './OrderSummaryTable.css'

function OrderSummaryTable({
  summaryPeriod,
  summaryDate,
  onSummaryPeriodChange,
  onSummaryDateChange,
  summary,
  summaryRange,
  isSummaryLoading,
}) {
  const periodOptions = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
  ]

  function getRangeLabel() {
    const period = summaryRange?.period || summaryPeriod

    if (!summaryRange?.start || !summaryRange?.end) {
      return 'Range unavailable'
    }

    if (period === 'daily') {
      return `Daily: ${formatAdminDate(summaryRange.start, { year: 'numeric', month: 'short', day: 'numeric' })}`
    }

    if (period === 'weekly') {
      const from = formatAdminDate(summaryRange.start, { month: 'short', day: 'numeric' })
      const to = formatAdminDate(summaryRange.end, { year: 'numeric', month: 'short', day: 'numeric' })
      return `Weekly: ${from} - ${to}`
    }

    if (period === 'monthly') {
      return `Monthly: ${formatAdminDate(summaryRange.start, { year: 'numeric', month: 'long' })}`
    }

    return `Yearly: ${formatAdminDate(summaryRange.start, { year: 'numeric' })}`
  }

  return (
    <div className='admin-summary-table-wrap'>
      <div className='admin-summary-header'>
        <h4>Summary</h4>
        <div className='admin-summary-controls'>
          <div className='admin-segmented-control' role='tablist' aria-label='Summary period'>
            {periodOptions.map((option) => (
              <button
                key={option.key}
                type='button'
                className={`admin-segment-btn ${summaryPeriod === option.key ? 'active' : ''}`}
                onClick={() => onSummaryPeriodChange(option.key)}
                aria-pressed={summaryPeriod === option.key}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className='admin-calendar-filter' htmlFor='summaryReferenceDate'>
            <span className='admin-calendar-pill'>Calendar</span>
            <input
              id='summaryReferenceDate'
              type='date'
              value={summaryDate}
              onChange={onSummaryDateChange}
              aria-label='Summary reference date'
            />
          </label>
        </div>
      </div>
      <p className='admin-summary-range'>{isSummaryLoading ? 'Updating summary...' : getRangeLabel()}</p>
      <table className='admin-summary-table'>
        <thead>
          <tr>
            <th>Total Orders In Database</th>
            <th>Orders Created</th>
            <th>Pending Deliveries</th>
            <th>Orders Delivered</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{isSummaryLoading ? 'Loading...' : summary.totalOrdersInDatabase}</td>
            <td>{isSummaryLoading ? 'Loading...' : summary.ordersCreated}</td>
            <td>{isSummaryLoading ? 'Loading...' : summary.pendingDeliveries}</td>
            <td>{isSummaryLoading ? 'Loading...' : summary.ordersDelivered}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default OrderSummaryTable