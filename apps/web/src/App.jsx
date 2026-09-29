import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './App.css'
import Hero from './assets/Hero.jpeg'
import SearchBar from './components/SearchBar'
import Header from './components/Header'
import Footer from './components/Footer'
import Button from './components/Button'
import SectionWrapper from './components/SectionWrapper'
import ServiceCard from './components/ServiceCard'
import SwooshDivider from './components/SwooshDivider'
import TrackingPage from './TrackingPage'
import RiderPage from './RiderPage'
import AdminPage from './Admin/AdminPage'
import AdminRidersPage from './Admin/AdminRidersPage'
import { ClockCheck, SendHorizontal, BriefcaseBusiness } from 'lucide-react'
import { isTrackingIdFormatValid, normalizeTrackingId } from './data/trackingData'

function App() {
  const navigate = useNavigate()

  async function handleTracking(id) {
    const normalizedId = normalizeTrackingId(id)

    // Keep the search rules consistent anywhere the component is reused.
    if (!isTrackingIdFormatValid(normalizedId)) {
      return false
    }

    navigate(`/tracking/${normalizedId}`)
    return true
  }

  return (
    <Routes>
      <Route
        path='/'
        element={
          <div className='home-page'>
            <Header />
            <main>
            <section className='hero-section' style={{ backgroundImage: `url(${Hero})` }}>
              <div className='hero-content'>
                <p className='eyebrow'>Lagos dispatch, done right</p>
                <h1>Move anything.<br /><em>Deliver anywhere</em> across Lagos.</h1>
                <p className='motto'>Faithfulness in every delivery.</p>
                <Button href='https://wa.me/2349112414541' target='_blank' rel='noreferrer' variant='whatsapp'>Book on WhatsApp</Button>
                <SearchBar onSubmit={handleTracking} />
              </div>
            </section>
            <SwooshDivider />
            <SectionWrapper tone='offwhite' className='services-section'>
              <div className='section-heading'><p className='eyebrow'>What we move</p><h2>Reliable logistics for the pace of Lagos.</h2></div>
              <div className='service'>
                <ServiceCard number='01' icon={<ClockCheck size={28} aria-hidden='true' />} title='Same-day delivery'>Fast and reliable delivery when timing matters.</ServiceCard>
                <ServiceCard number='02' icon={<SendHorizontal size={28} aria-hidden='true' />} title='Express dispatch'>Rapid dispatch for urgent shipments across the city.</ServiceCard>
                <ServiceCard number='03' icon={<BriefcaseBusiness size={28} aria-hidden='true' />} title='Business logistics'>Tailored delivery solutions that keep business moving.</ServiceCard>
              </div>
              <Button href='https://wa.me/2349112414541' target='_blank' rel='noreferrer'>Talk to our dispatch team</Button>
            </SectionWrapper>
            </main>
            <Footer />
          </div>
        }
      />
      <Route path='/tracking/:id' element={<TrackingPage />} />
      <Route path='/rider' element={<RiderPage />} />
      <Route path='/rider/:id' element={<Navigate to='/rider' replace />} />
      <Route path='/admin' element={<AdminPage />} />
      <Route path='/admin/customers' element={<AdminPage />} />
      <Route path='/admin/riders' element={<AdminRidersPage />} />
    </Routes>
  )
}

export default App
