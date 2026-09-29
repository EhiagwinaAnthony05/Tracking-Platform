import './Footer.css'
import { MapPin, Phone, MessageCircle } from 'lucide-react'

function Footer() {
  return (
    <footer className='mx-footer'>
      <div className='mx-footer-inner'>
        <div><p className='footer-kicker'>MoveX Xpress</p><h3>Faithfulness in every delivery.</h3></div>
        <div className='mx-footer-links'>
          <a href='tel:09112414541' aria-label='Call MoveX Xpress'><Phone size={16} aria-hidden='true' />09112414541
          </a>
          <a href='https://wa.me/2349112414541' target='_blank' rel='noreferrer' aria-label='Chat on WhatsApp'><MessageCircle size={16} aria-hidden='true' />WhatsApp
          </a>
          <span><MapPin size={16} aria-hidden='true' />Lagos, Nigeria</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
