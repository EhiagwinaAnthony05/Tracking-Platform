import { useEffect, useState } from 'react'
import { createOrder, updateOrderStatus } from '../services/orderService'
import { DELIVERY_STATUSES as DELIVERY_STATUS_OPTIONS } from '@movex/shared'
import { getRiders } from '../services/riderService'

const INITIAL_CREATE_FORM = {
  trackingId: '',
  sender: {
    name: '',
    phone: '',
    address: '',
  },
  receiver: {
    name: '',
    phone: '',
    address: '',
    location: {
      lat: '',
      lng: '',
    },
  },
  package: {
    description: '',
  },
  delivery: {
    status: DELIVERY_STATUS_OPTIONS[0],
  },
  rider: {
    riderId: '',
    name: '',
    phone: '',
    currentLocation: '',
  },
}

const INITIAL_UPDATE_FORM = {
  trackingId: '',
  delivery: {
    status: DELIVERY_STATUS_OPTIONS[1],
  },
  receiver: {
    location: {
      lat: '',
      lng: '',
    },
  },
  rider: {
    riderId: '',
    name: '',
    phone: '',
  },
}

function updateNestedValue(current, path, value) {
  const keys = path.split('.')
  const next = { ...current }
  let pointer = next

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index]
    pointer[key] = { ...pointer[key] }
    pointer = pointer[key]
  }

  pointer[keys[keys.length - 1]] = value
  return next
}

export default function useOrderManagementForms({ onMutationSuccess, enabled = false }) {
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM)
  const [updateForm, setUpdateForm] = useState(INITIAL_UPDATE_FORM)
  const [createResult, setCreateResult] = useState('')
  const [updateResult, setUpdateResult] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [riders, setRiders] = useState([])
  const [isRidersLoading, setIsRidersLoading] = useState(false)

  async function loadRiders() {
    setIsRidersLoading(true)
    const result = await getRiders()

    if (result.success) {
      setRiders(result.data)
    }

    setIsRidersLoading(false)
  }

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    async function loadInitialRiders() {
      setIsRidersLoading(true)
      const result = await getRiders()

      if (cancelled) {
        return
      }

      if (result.success) {
        setRiders(result.data)
      }

      setIsRidersLoading(false)
    }

    loadInitialRiders()

    return () => {
      cancelled = true
    }
  }, [enabled])

  function handleCreateChange(event) {
    const { name, value } = event.target

    if (name === 'rider.riderId') {
      const selectedRider = riders.find((rider) => rider.id === value)

      if (!selectedRider) {
        setCreateForm((current) => ({
          ...current,
          rider: {
            riderId: '',
            name: '',
            phone: '',
            currentLocation: '',
          },
        }))
        return
      }

      setCreateForm((current) => ({
        ...current,
        rider: {
          riderId: selectedRider.id,
          name: selectedRider.name,
          phone: selectedRider.phone,
          currentLocation: selectedRider.lastLocation?.placeName || '',
        },
      }))
      return
    }

    setCreateForm((current) => updateNestedValue(current, name, value))
  }

  function handleUpdateChange(event) {
    const { name, value } = event.target
    setUpdateForm((current) => updateNestedValue(current, name, value))
  }

  function preloadUpdateForm(order) {
    setUpdateForm({
      trackingId: order.trackingId,
      delivery: {
        status: order.delivery?.status || DELIVERY_STATUS_OPTIONS[1],
      },
      receiver: {
        location: {
          lat: order.receiver?.location?.lat ?? '',
          lng: order.receiver?.location?.lng ?? '',
        },
      },
      rider: {
        riderId: order.rider?.riderId || '',
        name: order.rider?.name || '',
        phone: order.rider?.phone || '',
      },
    })
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    setCreateResult('')
    setIsCreating(true)

    const result = await createOrder(createForm)

    if (!result.success) {
      setCreateResult(result.error)
      setIsCreating(false)
      return
    }

    setCreateResult(`Order ${result.data.trackingId} created successfully.`)

    if (onMutationSuccess) {
      await onMutationSuccess()
    }

    await loadRiders()
    setCreateForm(INITIAL_CREATE_FORM)
    setIsCreating(false)
  }

  async function handleUpdateSubmit(event) {
    event.preventDefault()
    setUpdateResult('')
    setIsUpdating(true)

    const result = await updateOrderStatus(updateForm.trackingId, {
      delivery: updateForm.delivery,
      receiver: updateForm.receiver,
      rider: updateForm.rider,
    })

    if (!result.success) {
      setUpdateResult(result.error)
      setIsUpdating(false)
      return
    }

    setUpdateResult(`Order ${result.data.trackingId} updated to ${result.data.delivery.status}.`)

    if (onMutationSuccess) {
      await onMutationSuccess()
    }

    await loadRiders()
    setIsUpdating(false)
  }

  return {
    createForm,
    updateForm,
    createResult,
    updateResult,
    isCreating,
    isUpdating,
    handleCreateChange,
    handleUpdateChange,
    preloadUpdateForm,
    handleCreateSubmit,
    handleUpdateSubmit,
    deliveryStatusOptions: DELIVERY_STATUS_OPTIONS,
    riders,
    isRidersLoading,
    refreshRiders: loadRiders,
  }
}
