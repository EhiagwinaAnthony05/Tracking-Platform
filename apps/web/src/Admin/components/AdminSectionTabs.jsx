import { NavLink } from 'react-router-dom'

function AdminSectionTabs() {
  return (
    <nav className='admin-section-tabs' aria-label='Admin section navigation'>
      <NavLink
        to='/admin/customers'
        className={({ isActive }) => `admin-section-tab ${isActive ? 'active' : ''}`}
      >
        Customer Page
      </NavLink>
      <NavLink
        to='/admin/riders'
        className={({ isActive }) => `admin-section-tab ${isActive ? 'active' : ''}`}
      >
        Rider Page
      </NavLink>
    </nav>
  )
}

export default AdminSectionTabs
