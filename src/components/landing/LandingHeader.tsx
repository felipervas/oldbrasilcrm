import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export const LandingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/old-brasil-logo.png"
              alt="OLD BRASIL"
              className="h-10 md:h-12"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#recursos"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Recursos
            </a>
            <a
              href="#beneficios"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Benefícios
            </a>
            <a
              href="#depoimentos"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Depoimentos
            </a>
            <Link to="/loja">
              <Button variant="outline" size="sm">
                Loja
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Acessar Sistema
              </Button>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <a
                href="#recursos"
                className="text-sm font-medium text-foreground/80 hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Recursos
              </a>
              <a
                href="#beneficios"
                className="text-sm font-medium text-foreground/80 hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Benefícios
              </a>
              <a
                href="#depoimentos"
                className="text-sm font-medium text-foreground/80 hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Depoimentos
              </a>
              <Link to="/loja" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  Loja
                </Button>
              </Link>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                  Acessar Sistema
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
