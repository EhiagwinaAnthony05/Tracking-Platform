import './DesignSystem.css'

function CircleImage({ src, alt, className = '' }) {
  return <img className={`mx-circle-image ${className}`} src={src} alt={alt} loading='lazy' />
}

export default CircleImage