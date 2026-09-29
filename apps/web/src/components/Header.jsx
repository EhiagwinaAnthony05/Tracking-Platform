import './Header.css'
import Button from './Button'

function Header() {
  return (
    <header className='header'>
      <a className='wordmark' href='/' aria-label='MoveX Xpress home'>MOVE<span>X</span> XPRESS</a>
      <Button href='https://wa.me/2349112414541' target='_blank' rel='noreferrer'>Book a delivery</Button>
    </header>
  )
}

export default Header