import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackEvent, CONVERSION_EVENTS } from '@/lib/analytics';

export const HeroSection = () => {
  const handleDemoClick = () => {
    trackEvent(CONVERSION_EVENTS.HERO_CTA_CLICK, { cta: 'demo' });
    document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleWhatsAppClick = () => {
    trackEvent(CONVERSION_EVENTS.WHATSAPP_CLICK, { origin: 'hero' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 pt-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] -z-10" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Sistema em Nuvem - Sempre Atualizado
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Venda Mais, Gerencie Melhor com{' '}
              <span className="text-primary">CRM Completo</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Sistema profissional de gestão de vendas, clientes e equipe em uma única plataforma.
              Aumente sua produtividade em <strong className="text-foreground">3x</strong>.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={handleDemoClick}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all group"
              >
                Solicitar Demonstração Gratuita
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={handleWhatsAppClick}
                asChild
              >
                <a
                  href="https://wa.me/5547999999999?text=Olá%2C%20quero%20saber%20mais%20sobre%20o%20CRM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  Fale com Especialista
                </a>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background flex items-center justify-center text-white text-xs font-semibold"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="font-semibold text-foreground">500+ empresas</div>
                <div className="text-muted-foreground">confiam no nosso CRM</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl shadow-2xl overflow-hidden border border-border bg-background">
              {/* Mockup Browser Bar */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-700 rounded px-3 py-1 text-xs text-muted-foreground">
                  app.oldbrasil.com/dashboard
                </div>
              </div>
              
              {/* Dashboard Screenshot Placeholder */}
              <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8">
                <div className="h-full bg-background/80 backdrop-blur-sm rounded-lg border border-border p-6 space-y-4">
                  {/* Simulated Dashboard Elements */}
                  <div className="flex items-center justify-between">
                    <div className="h-8 bg-primary/20 rounded w-32"></div>
                    <div className="h-8 bg-primary/20 rounded w-24"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-primary/10 rounded"></div>
                    ))}
                  </div>
                  <div className="h-32 bg-primary/10 rounded"></div>
                </div>
              </div>
            </div>

            {/* Floating Stats */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -left-4 top-1/4 bg-background border border-border rounded-lg shadow-lg p-4"
            >
              <div className="text-3xl font-bold text-primary">+3x</div>
              <div className="text-xs text-muted-foreground">Produtividade</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute -right-4 bottom-1/4 bg-background border border-border rounded-lg shadow-lg p-4"
            >
              <div className="text-3xl font-bold text-green-600">98%</div>
              <div className="text-xs text-muted-foreground">Satisfação</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
