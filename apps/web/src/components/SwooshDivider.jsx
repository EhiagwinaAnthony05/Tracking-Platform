import './DesignSystem.css'

function SwooshDivider() {
  return <svg className='mx-swoosh' viewBox='0 0 1200 80' preserveAspectRatio='none' aria-hidden='true'><path fill='var(--color-green)' d='M0 0h1200v40C900 78 470 68 0 22z' /><path fill='var(--color-lime)' d='M0 10c470 46 900 56 1200 18v9C900 75 470 64 0 19z' /></svg>
}

export default SwooshDivider