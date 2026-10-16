import React from 'react'
import HeroCarousel from '@components/HeroCarousel/HeroCarousel'
import AboutSection from '@components/sections/Home/AboutSection/AboutSection'
import FeaturedProducts from '@components/sections/Home/FeaturedProducts/FeaturedProducts'
import WhySnaSundaram  from '@components/sections/Home/WhySnaSundaram/WhySnaSundaram'
import TopFeaturedProduct  from '@components/sections/Home/TopFeaturedProduct/TopFeaturedProduct'
import Testimonials from '@components/sections/Home/Testimonials/Testimonials'
import FAQ from '@components/sections/Home/FAQ/FAQ'
const Home = () => {
  return (
    <div>
    <HeroCarousel />
    <AboutSection/>
<FeaturedProducts/>
<WhySnaSundaram />
<TopFeaturedProduct/>
<Testimonials/>
<FAQ/>


    </div>
  )
}

export default Home