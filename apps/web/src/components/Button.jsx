import { MessageCircle } from 'lucide-react'
import './DesignSystem.css'

function Button({ children, href, variant = 'primary', className = '', ...props }) {
  const content = <>{variant === 'whatsapp' && <MessageCircle size={18} aria-hidden='true' />}{children}</>
  const classNames = `mx-button mx-button--${variant} ${className}`

  return href ? <a className={classNames} href={href} {...props}>{content}</a> : <button className={classNames} {...props}>{content}</button>
}

export default Button