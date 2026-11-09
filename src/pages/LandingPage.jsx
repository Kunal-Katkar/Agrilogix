import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import RoleCard from '../components/RoleCard';
import StepFlow from '../components/StepFlow';
import FeatureGrid from '../components/FeatureGrid';
import StatsStrip from '../components/StatsStrip';
import Testimonials from '../components/Testimonials';
import CtaSection from '../components/CtaSection';
import Footer from '../components/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9FBF7]">
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <RoleCard />
        <StepFlow />
        <FeatureGrid />
        <StatsStrip />
        <Testimonials />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
