import { BarChart3, Smartphone, Target, TrendingUp, Truck, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { trackEvent, CONVERSION_EVENTS } from '@/lib/analytics';

const features = [
  {
    icon: BarChart3,
    title: 'Veja Tudo em Um Painel Visual',
    description: 'Sem planilhas! Todas as suas vendas, leads e métricas em tempo real em um dashboard bonito e fácil de usar.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Smartphone,
    title: 'Trabalhe de Qualquer Lugar',
    description: 'Na rua, em casa ou no escritório. Acesse pelo celular, tablet ou computador com sincronização automática.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Target,
    title: 'Nunca Mais Perca Um Lead',
    description: 'Visualize todo o funil de vendas em cards arrastáveis. Organize prospects e acompanhe cada negociação até o fechamento.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: TrendingUp,
    title: 'Relatórios Prontos Todo Dia',
    description: 'Sem precisar fazer nada! Receba análises automáticas de performance, conversão e resultados da sua equipe.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: Truck,
    title: 'Economize Combustível e Tempo',
    description: 'Planeje rotas inteligentes para visitas e entregas. GPS integrado mostra o caminho mais rápido e barato.',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  {
    icon: Wallet,
    title: 'Controle Financeiro Automático',
    description: 'Esqueça planilhas financeiras! Gerencie contas a pagar, receber e fluxo de caixa em um só lugar.',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
];

export const FeaturesGrid = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="recursos" ref={ref} className="py-20 md:py-32" style={{ background: 'var(--section-gradient)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4"
          >
            6 Ferramentas Poderosas em{' '}
            <span className="text-primary">Uma Única Plataforma</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Tudo que você precisa para <strong className="text-foreground">vender mais e trabalhar menos</strong>
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              onClick={() =>
                trackEvent(CONVERSION_EVENTS.FEATURE_CLICK, {
                  feature: feature.title,
                })
              }
              className="group relative bg-background rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/20 cursor-pointer"
            >
              {/* Icon */}
              <div
                className={`${feature.bg} ${feature.color} w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="w-7 h-7" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
