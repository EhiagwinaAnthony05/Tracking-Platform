import './DesignSystem.css'

function SectionWrapper({ children, tone = 'offwhite', className = '', ...props }) {
  return <section className={`mx-section mx-section--${tone} ${className}`} {...props}><div className='mx-section__inner'>{children}</div></section>
}

export default SectionWrapper