import { useEffect, useRef, useState } from 'react'
import { formatAdminDateTime } from '../utils/formatDate'
import { getRiderAssignmentWarning, getRiderOptionLabel, sortRidersByAvailability } from '../utils/riderStatus'
import { copyTrackingUrl, getWhatsAppShareUrl } from '../utils/trackingLink'
import './OrdersTable.css'

function isDelivered(order) {
  return (order?.delivery?.status || '').toLowerCase() === 'delivered'
}

function OrdersTable({
  orders,
  activeOrderId,
  isLoading,
  onEdit,
  onDelete,
  riders = [],
  onRefreshRiders,
  onAssign,
  onUnassign,
  onEndTrip,
}) {
  const rowRefs = useRef({})
  const [pendingDeleteId, setPendingDeleteId] = useState('')
  const [pendingEndTripId, setPendingEndTripId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [assigningOrder, setAssigningOrder] = useState(null)
  const [assignRiderId, setAssignRiderId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [copiedId, setCopiedId] = useState('')

  const assignCandidate = riders.find((rider) => rider.id === assignRiderId)
  const assignWarning = getRiderAssignmentWarning(assignCandidate)

  async function handleCopyLink(trackingId) {
    const copied = await copyTrackingUrl(trackingId)

    if (copied) {
      setCopiedId(trackingId)
      setTimeout(() => setCopiedId((current) => (current === trackingId ? '' : current)), 2000)
    }
  }

  function openAssignModal(order) {
    setAssigningOrder(order)
    setAssignRiderId(order.rider?.riderId || '')

    // Online status changes minute to minute; fetch it fresh before dispatch picks someone.
    if (onRefreshRiders) {
      onRefreshRiders()
    }
  }

  function closeAssignModal() {
    setAssigningOrder(null)
    setAssignRiderId('')
  }

  async function confirmAssign() {
    if (!assigningOrder || !assignRiderId) {
      return
    }

    setIsAssigning(true)
    const assigned = await onAssign(assigningOrder.trackingId, assignRiderId)
    setIsAssigning(false)

    if (assigned) {
      closeAssignModal()
    }
  }

  async function confirmUnassign() {
    if (!assigningOrder) {
      return
    }

    setIsAssigning(true)
    const unassigned = await onUnassign(assigningOrder.trackingId)
    setIsAssigning(false)

    if (unassigned) {
      closeAssignModal()
    }
  }

  function confirmEndTrip() {
    if (!pendingEndTripId) {
      return
    }

    onEndTrip(pendingEndTripId)
    setPendingEndTripId('')
  }

  function openDetailsModal(order) {
    setSelectedOrder(order)
  }

  function closeDetailsModal() {
    setSelectedOrder(null)
  }

  function openDeleteModal(trackingId) {
    setPendingDeleteId(trackingId)
  }

  function closeDeleteModal() {
    setPendingDeleteId('')
  }

  function confirmDelete() {
    if (!pendingDeleteId) {
      return
    }

    onDelete(pendingDeleteId)
    closeDeleteModal()
  }

  const riderName =
    selectedOrder?.rider?.name ||
    selectedOrder?.rider?.deliveredSnapshot?.name ||
    'Unassigned'
  const riderPhone =
    selectedOrder?.rider?.phone ||
    selectedOrder?.rider?.deliveredSnapshot?.phone ||
    '-'
  const riderLocation =
    selectedOrder?.rider?.currentLocation ||
    selectedOrder?.rider?.deliveredSnapshot?.currentLocation ||
    '-'

  const sortedOrders = [...orders].sort((leftOrder, rightOrder) => {
    const leftDelivered = (leftOrder.delivery?.status || '').toLowerCase() === 'delivered'
    const rightDelivered = (rightOrder.delivery?.status || '').toLowerCase() === 'delivered'

    if (leftDelivered !== rightDelivered) {
      return leftDelivered ? 1 : -1
    }

    const leftCreatedAt = leftOrder.createdAt ? new Date(leftOrder.createdAt).getTime() : 0
    const rightCreatedAt = rightOrder.createdAt ? new Date(rightOrder.createdAt).getTime() : 0

    return rightCreatedAt - leftCreatedAt
  })

  useEffect(() => {
    if (!activeOrderId) {
      return
    }

    const targetRow = rowRefs.current[activeOrderId]
    if (!targetRow) {
      return
    }

    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  }, [activeOrderId, sortedOrders])

  return (
    <>
      <div className='admin-table-wrap'>
        <table className='admin-table'>
          <thead>
            <tr>
              <th>S/N</th>
              <th>Tracking ID</th>
              <th>Date Created</th>
              <th>Sender</th>
              <th>Receiver</th>
              <th>Package</th>
              <th>Rider</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.length === 0 ? (
              <tr>
                <td colSpan='10' className='admin-table-empty'>
                  {isLoading ? 'Loading orders...' : 'No orders found yet.'}
                </td>
              </tr>
            ) : (
              sortedOrders.map((order, index) => (
                <tr
                  key={order.trackingId}
                  ref={(element) => {
                    if (element) {
                      rowRefs.current[order.trackingId] = element
                    }
                  }}
                  className={activeOrderId === order.trackingId ? 'admin-order-row-highlight' : ''}
                >
                  <td>{index + 1}</td>
                  <td>
                    <button
                      type='button'
                      className='admin-tracking-link'
                      onClick={() => openDetailsModal(order)}
                    >
                      {order.trackingId}
                    </button>
                  </td>
                  <td>{formatAdminDateTime(order.createdAt)}</td>
                  <td>{order.sender?.name || '-'}</td>
                  <td>{order.receiver?.name || '-'}</td>
                  <td>{order.package?.description || '-'}</td>
                  <td>{order.rider?.name || order.rider?.deliveredSnapshot?.name || 'Unassigned'}</td>
                  <td>{order.delivery?.status || '-'}</td>
                  <td>{formatAdminDateTime(order.updatedAt)}</td>
                  <td>
                    <div className='admin-row-actions'>
                      {!isDelivered(order) ? (
                        <>
                          <button type='button' className='admin-row-btn' onClick={() => openAssignModal(order)}>
                            {order.rider?.riderId ? 'Change rider' : 'Assign rider'}
                          </button>
                          <button type='button' className='admin-row-btn' onClick={() => handleCopyLink(order.trackingId)}>
                            {copiedId === order.trackingId ? 'Copied!' : 'Copy link'}
                          </button>
                          <a
                            className='admin-row-btn'
                            href={getWhatsAppShareUrl(order)}
                            target='_blank'
                            rel='noreferrer'
                          >
                            WhatsApp
                          </a>
                          <button type='button' className='admin-row-btn primary' onClick={() => setPendingEndTripId(order.trackingId)}>
                            End trip
                          </button>
                        </>
                      ) : null}
                      <button type='button' className='admin-row-btn' onClick={() => onEdit(order)}>
                        Edit
                      </button>
                      <button type='button' className='admin-row-btn danger' onClick={() => openDeleteModal(order.trackingId)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pendingDeleteId && (
        <div className='admin-delete-modal-overlay' onClick={closeDeleteModal}>
          <section className='admin-delete-modal' onClick={(event) => event.stopPropagation()}>
            <h4>Delete Order?</h4>
            <p>
              This action will permanently remove <strong>{pendingDeleteId}</strong>.
            </p>
            <div className='admin-delete-modal-actions'>
              <button type='button' className='admin-delete-btn secondary' onClick={closeDeleteModal}>
                Cancel
              </button>
              <button type='button' className='admin-delete-btn primary' onClick={confirmDelete}>
                Yes, Delete
              </button>
            </div>
          </section>
        </div>
      )}

      {pendingEndTripId && (
        <div className='admin-delete-modal-overlay' onClick={() => setPendingEndTripId('')}>
          <section className='admin-delete-modal' onClick={(event) => event.stopPropagation()}>
            <h4>End trip?</h4>
            <p>
              <strong>{pendingEndTripId}</strong> will be marked as delivered. The customer&apos;s tracking page
              stops showing the rider&apos;s location.
            </p>
            <div className='admin-delete-modal-actions'>
              <button type='button' className='admin-delete-btn secondary' onClick={() => setPendingEndTripId('')}>
                Cancel
              </button>
              <button type='button' className='admin-delete-btn confirm' onClick={confirmEndTrip}>
                Yes, end trip
              </button>
            </div>
          </section>
        </div>
      )}

      {assigningOrder && (
        <div className='admin-delete-modal-overlay' onClick={closeAssignModal}>
          <section className='admin-delete-modal' onClick={(event) => event.stopPropagation()}>
            <h4>Assign rider to {assigningOrder.trackingId}</h4>
            <p>Riders sharing a live location are listed first.</p>
            <select
              className='admin-modal-select'
              value={assignRiderId}
              onChange={(event) => setAssignRiderId(event.target.value)}
            >
              <option value=''>Select a rider</option>
              {sortRidersByAvailability(riders).map((rider) => (
                <option key={rider.id} value={rider.id}>
                  {getRiderOptionLabel(rider)}
                </option>
              ))}
            </select>
            {assignWarning ? <p className='admin-modal-warning'>{assignWarning}</p> : null}
            <div className='admin-delete-modal-actions'>
              {assigningOrder.rider?.riderId ? (
                <button type='button' className='admin-delete-btn secondary' onClick={confirmUnassign} disabled={isAssigning}>
                  Remove rider
                </button>
              ) : null}
              <button type='button' className='admin-delete-btn secondary' onClick={closeAssignModal}>
                Cancel
              </button>
              <button
                type='button'
                className='admin-delete-btn confirm'
                onClick={confirmAssign}
                disabled={!assignRiderId || isAssigning}
              >
                {isAssigning ? 'Saving...' : 'Assign'}
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedOrder && (
        <div className='admin-delete-modal-overlay' onClick={closeDetailsModal}>
          <section className='admin-order-modal' onClick={(event) => event.stopPropagation()}>
            <div className='admin-order-modal__header'>
              <h4>Order Details: {selectedOrder.trackingId}</h4>
              <button type='button' className='admin-delete-btn secondary' onClick={closeDetailsModal}>
                Close
              </button>
            </div>

            <div className='admin-order-modal__grid'>
              <p><strong>Status:</strong> {selectedOrder.delivery?.status || '-'}</p>
              <p><strong>Created:</strong> {formatAdminDateTime(selectedOrder.createdAt)}</p>
              <p><strong>Updated:</strong> {formatAdminDateTime(selectedOrder.updatedAt)}</p>
              <p><strong>Package:</strong> {selectedOrder.package?.description || '-'}</p>
              <p><strong>Sender:</strong> {selectedOrder.sender?.name || '-'} ({selectedOrder.sender?.phone || '-'})</p>
              <p><strong>Sender Address:</strong> {selectedOrder.sender?.address || '-'}</p>
              <p><strong>Receiver:</strong> {selectedOrder.receiver?.name || '-'} ({selectedOrder.receiver?.phone || '-'})</p>
              <p><strong>Receiver Address:</strong> {selectedOrder.receiver?.address || '-'}</p>
              <p><strong>Rider:</strong> {riderName}</p>
              <p><strong>Rider Phone:</strong> {riderPhone}</p>
              <p><strong>Current Location:</strong> {riderLocation}</p>
              <p><strong>ETA:</strong> {selectedOrder.rider?.estimatedDelivery || '-'}</p>
              <p>
                <strong>Receiver map pin:</strong>{' '}
                {Number.isFinite(selectedOrder.receiver?.location?.lat)
                  ? 'Found'
                  : 'Address not found on map. Add coordinates with Edit so the ETA can be calculated.'}
              </p>
            </div>

            <div className='admin-order-modal__timeline'>
              <h5>Progress Timeline</h5>
              <ul>
                {(selectedOrder.steps || []).map((step, index) => (
                  <li key={`${step.status}-${index}`}>
                    <strong>{step.status}</strong>
                    {' - '}
                    {step.completed ? `${step.date || ''} ${step.time || ''}`.trim() || 'Completed' : 'Pending'}
                    {step.location ? ` | ${step.location}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default OrdersTable