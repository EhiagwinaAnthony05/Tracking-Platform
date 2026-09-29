import OrderSummaryTable from './OrderSummaryTable'
import OrdersTable from './OrdersTable'
import SearchOrderForm from './SearchOrderForm'

function TrackOrderPreview({
  previewId,
  setPreviewId,
  onSubmit,
  isLoading,
  summaryPeriod,
  summaryDate,
  onSummaryPeriodChange,
  onSummaryDateChange,
  summary,
  summaryRange,
  activeOrderId,
  isSummaryLoading,
  storageMessage,
  orders,
  onEdit,
  onDelete,
  riders,
  onRefreshRiders,
  onAssign,
  onUnassign,
  onEndTrip,
}) {
  return (
    <section className='admin-card admin-preview-card'>
      <h3>Track Order Preview</h3>
      <SearchOrderForm previewId={previewId} setPreviewId={setPreviewId} onSubmit={onSubmit} isLoading={isLoading} />
      {storageMessage && <p className='admin-result'>{storageMessage}</p>}
      <OrderSummaryTable
        summaryPeriod={summaryPeriod}
        summaryDate={summaryDate}
        onSummaryPeriodChange={onSummaryPeriodChange}
        onSummaryDateChange={onSummaryDateChange}
        summary={summary}
        summaryRange={summaryRange}
        isSummaryLoading={isSummaryLoading}
      />
      <OrdersTable
        orders={orders}
        activeOrderId={activeOrderId}
        isLoading={isLoading}
        onEdit={onEdit}
        onDelete={onDelete}
        riders={riders}
        onRefreshRiders={onRefreshRiders}
        onAssign={onAssign}
        onUnassign={onUnassign}
        onEndTrip={onEndTrip}
      />
    </section>
  )
}

export default TrackOrderPreview