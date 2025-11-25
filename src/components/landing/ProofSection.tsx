import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users, Package, TrendingUp, Star } from 'lucide-react';

const stats = [
  {
    icon: Package,
    value: '500+',
    label: 'Pedidos Gerenciados/Mês',
    color: 'text-blue-600',
  },
  {
    icon: Users,
    value: '50+',
    label: 'Empresas Confiam',
    color: 'text-purple-600',
  },
  {
    icon: TrendingUp,
    value: '3x',
    label: 'Aumento de Produtividade',
    color: 'text-green-600',
  },
  {
    icon: Star,
    value: '98%',
    label: 'Satisfação dos Clientes',
    color: 'text-orange-600',
  },
];

export const ProofSection = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="beneficios" ref={ref} className="py-20 md:py-32 bg-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4"
          >
            Resultados que{' '}
            <span className="text-primary">impressionam</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Números reais de empresas que transformaram sua gestão com nosso CRM
          </motion.p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-background rounded-2xl p-8 shadow-lg text-center border border-border hover:border-primary/20 transition-all duration-300"
            >
              <div className={`${stat.color} w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Brands Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <p className="text-sm font-medium text-muted-foreground mb-8">
            Trabalhamos com as melhores marcas do mercado
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
            {['Nestlé', 'Deux', 'Bauducco', 'Cacau Show', 'Mondelez'].map((brand) => (
              <div
                key={brand}
                className="text-2xl md:text-3xl font-bold text-foreground/40"
              >
                {brand}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProofSection;
