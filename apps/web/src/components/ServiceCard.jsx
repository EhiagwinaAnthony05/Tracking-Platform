import './DesignSystem.css'

function ServiceCard({ number, icon, title, children }) {
  return <article className='mx-service-card'><span className='mx-number-pill' aria-label={`Service ${number}`}>{number}</span>{icon}<h3>{title}</h3><p>{children}</p></article>
}

export default ServiceCard