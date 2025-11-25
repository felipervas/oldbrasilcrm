import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Como funciona o período de demonstração?',
    answer:
      'Oferecemos uma demonstração completa e gratuita do sistema, onde mostramos todas as funcionalidades e tiramos suas dúvidas. Não há compromisso de contratação.',
  },
  {
    question: 'É necessário instalar algum software?',
    answer:
      'Não! Nosso CRM é 100% baseado em nuvem. Você acessa diretamente pelo navegador de qualquer dispositivo com internet, sem necessidade de instalações.',
  },
  {
    question: 'Meus dados ficam seguros?',
    answer:
      'Sim! Utilizamos criptografia de ponta e backup automático diário. Nossos servidores seguem os mais altos padrões de segurança e conformidade com a LGPD.',
  },
  {
    question: 'Posso usar no celular?',
    answer:
      'Com certeza! O sistema é totalmente responsivo e otimizado para dispositivos móveis. Sua equipe pode acessar de qualquer lugar, a qualquer momento.',
  },
  {
    question: 'Como funciona o suporte técnico?',
    answer:
      'Oferecemos suporte via WhatsApp, email e telefone durante horário comercial. Clientes Premium têm acesso a suporte prioritário 24/7.',
  },
  {
    question: 'Posso importar meus dados atuais?',
    answer:
      'Sim! Nossa equipe auxilia na migração dos seus dados de planilhas ou outros sistemas. O processo é rápido e seguro.',
  },
  {
    question: 'O sistema tem limite de usuários?',
    answer:
      'Não! Você pode adicionar quantos usuários precisar. Cada plano tem diferentes níveis de acesso e permissões personalizáveis.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Sim, não trabalhamos com fidelidade. Você pode cancelar quando quiser, sem multas ou taxas adicionais.',
  },
];

export const FAQSection = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section ref={ref} className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4"
          >
            Perguntas{' '}
            <span className="text-primary">Frequentes</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Tire suas dúvidas sobre nosso CRM
          </motion.p>
        </div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-muted/50 rounded-lg border border-border px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-semibold text-foreground">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Extra CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground mb-4">
            Ainda tem dúvidas? Fale diretamente com nossa equipe
          </p>
          <a
            href="https://wa.me/5547999999999?text=Olá%2C%20tenho%20dúvidas%20sobre%20o%20CRM"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Chamar no WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
