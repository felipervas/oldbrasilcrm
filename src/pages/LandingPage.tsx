import { lazy, Suspense, useEffect } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FloatingWhatsApp } from '@/components/landing/FloatingWhatsApp';
import { UrgencyBanner } from '@/components/landing/UrgencyBanner';
import { LiveProof } from '@/components/landing/LiveProof';
import { ExitIntentModal } from '@/components/landing/ExitIntentModal';
import { WhatsAppInlineCTA } from '@/components/landing/WhatsAppInlineCTA';
import { Helmet } from 'react-helmet-async';
import { trackEvent, CONVERSION_EVENTS } from '@/lib/analytics';

// Lazy loading de seções abaixo da dobra
const FeaturesGrid = lazy(() => import('@/components/landing/FeaturesGrid'));
const ProofSection = lazy(() => import('@/components/landing/ProofSection'));
const TestimonialsCarousel = lazy(() => import('@/components/landing/TestimonialsCarousel'));
const CTASection = lazy(() => import('@/components/landing/CTASection'));
const FAQSection = lazy(() => import('@/components/landing/FAQSection'));
const LandingFooter = lazy(() => import('@/components/landing/LandingFooter'));

const SectionSkeleton = () => (
  <div className="h-96 bg-slate-100 animate-pulse rounded-lg mx-4" />
);

const LandingPage = () => {
  // Scroll depth tracking
  useEffect(() => {
    const scrollDepth = {
      '50': false,
      '75': false,
      '100': false,
    };
    
    const handleScroll = () => {
      const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      
      Object.keys(scrollDepth).forEach(depth => {
        if (scrolled >= parseInt(depth) && !scrollDepth[depth]) {
          trackEvent(`scroll_${depth}_percent` as any);
          scrollDepth[depth] = true;
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Time on page tracking
  useEffect(() => {
    const timer30 = setTimeout(() => {
      trackEvent(CONVERSION_EVENTS.TIME_ON_PAGE_30S);
    }, 30000);
    
    const timer60 = setTimeout(() => {
      trackEvent(CONVERSION_EVENTS.TIME_ON_PAGE_60S);
    }, 60000);
    
    return () => {
      clearTimeout(timer30);
      clearTimeout(timer60);
    };
  }, []);
  
  return (
    <>
      <Helmet>
        {/* Meta Tags Básicas */}
        <title>CRM para Distribuidoras | Sistema de Gestão de Vendas Completo</title>
        <meta
          name="description"
          content="CRM profissional para distribuidoras de alimentos. Gerencie vendas, clientes, rotas e equipe em uma única plataforma. Aumente sua produtividade em 3x."
        />
        <meta
          name="keywords"
          content="CRM distribuidora, gestão de vendas, pipeline vendas, gestão clientes, rotas vendas, sistema vendas"
        />

        {/* Open Graph (Facebook, LinkedIn) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="CRM para Distribuidoras | OLD BRASIL" />
        <meta
          property="og:description"
          content="Sistema completo de gestão de vendas para distribuidoras. Dashboard em tempo real, pipeline Kanban e muito mais."
        />
        <meta property="og:image" content="/old-brasil-logo.png" />
        <meta property="og:url" content={window.location.href} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CRM para Distribuidoras | OLD BRASIL" />
        <meta
          name="twitter:description"
          content="Sistema completo de gestão de vendas para distribuidoras."
        />
        <meta name="twitter:image" content="/old-brasil-logo.png" />

        {/* Structured Data (Schema.org) */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'OLD BRASIL CRM',
            applicationCategory: 'BusinessApplication',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'BRL',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '127',
            },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Urgency Banner */}
        <UrgencyBanner />
        
        {/* Header fixo */}
        <LandingHeader />

        {/* Hero - carregamento imediato */}
        <HeroSection />

        {/* Seções com lazy loading */}
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturesGrid />
        </Suspense>
        
        {/* WhatsApp Inline CTA após features */}
        <div className="py-12 px-4 container mx-auto">
          <WhatsAppInlineCTA contexto="features" />
        </div>

        <Suspense fallback={<SectionSkeleton />}>
          <ProofSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <TestimonialsCarousel />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <CTASection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <FAQSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <LandingFooter />
        </Suspense>

        {/* WhatsApp Flutuante */}
        <FloatingWhatsApp />
        
        {/* Live Proof Notifications */}
        <LiveProof />
        
        {/* Exit Intent Modal */}
        <ExitIntentModal />
      </div>
    </>
  );
};

export default LandingPage;
