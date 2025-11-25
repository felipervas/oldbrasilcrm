import { BarChart3, Smartphone, Target, TrendingUp, Truck, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { trackEvent, CONVERSION_EVENTS } from '@/lib/analytics';

const features = [
  {
    icon: BarChart3,
    title: 'Dashboard em Tempo Real',
    description: 'Visualize todas as métricas importantes em um painel intuitivo e atualizado automaticamente.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First',
    description: 'Acesse de qualquer lugar, a qualquer momento. App otimizado para dispositivos móveis.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Target,
    title: 'Pipeline de Vendas Kanban',
    description: 'Gerencie leads e prospects visualmente com sistema de arrastar e soltar.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: TrendingUp,
    title: 'Relatórios Automatizados',
    description: 'Análises detalhadas de performance, conversão e resultados da equipe.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: Truck,
    title: 'Gestão de Rotas',
    description: 'Otimize entregas e visitas com planejamento inteligente de rotas.',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  {
    icon: Wallet,
    title: 'Controle Financeiro',
    description: 'Gestão completa de contas a pagar, receber e fluxo de caixa integrado.',
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
    <section id="recursos" ref={ref} className="py-20 md:py-32 bg-gradient-to-b from-white to-blue-50/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4"
          >
            Tudo que você precisa em{' '}
            <span className="text-primary">um só lugar</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Funcionalidades poderosas para impulsionar suas vendas e otimizar a gestão do seu negócio
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
