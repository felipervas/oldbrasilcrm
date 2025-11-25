import { lazy, Suspense } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FloatingWhatsApp } from '@/components/landing/FloatingWhatsApp';
import { Helmet } from 'react-helmet-async';

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
        {/* Header fixo */}
        <LandingHeader />

        {/* Hero - carregamento imediato */}
        <HeroSection />

        {/* Seções com lazy loading */}
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturesGrid />
        </Suspense>

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
      </div>
    </>
  );
};

export default LandingPage;
