import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Search, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";
import { MarcasCarouselCompact } from "@/components/loja/MarcasCarouselCompact";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/old-brasil-logo.png";

export const LojaHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [marcas, setMarcas] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadMarcas();
  }, []);

  const loadMarcas = async () => {
    const { data } = await supabase
      .from('marcas')
      .select('id, nome, slug, imagem_banner')
      .eq('ativa', true)
      .not('imagem_banner', 'is', null)
      .order('nome');
    
    if (data) setMarcas(data);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (busca.trim()) {
      navigate(`/loja?busca=${encodeURIComponent(busca)}`);
      setMobileMenuOpen(false);
    }
  };

  const menuItems = [
    { label: "Produtos", href: "/loja" },
    { label: "Marcas", href: "/loja/marcas" },
    { label: "Catálogos", href: "/loja/catalogos" },
    { label: "Acessar CRM", href: "/crm" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/90 border-b border-[hsl(16_100%_57%)]/10 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo com Gradiente */}
            <Link to="/loja" className="flex items-center space-x-3 group">
              <div className="relative">
                <img src={logo} alt="OLD BRASIL" className="h-12 w-auto transition-transform group-hover:scale-110" />
                <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(16_100%_57%)] to-[hsl(142_76%_45%)] rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity" />
              </div>
              <span className="font-black text-xl hidden sm:inline bg-gradient-to-r from-[hsl(16_100%_57%)] to-[hsl(16_100%_67%)] bg-clip-text text-transparent" translate="no">
                Loja OLD BRASIL
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center max-w-xs">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar produtos..."
                  className="pl-9 w-full"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </form>

            {/* WhatsApp Button - Desktop */}
            <a
              href={gerarLinkWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex"
            >
              <Button className="bg-[#25d366] hover:bg-[#20ba5a] text-white">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </a>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-4 animate-in fade-in slide-in-from-top-2">
              {/* Mobile Search */}
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar produtos..."
                    className="pl-9 w-full"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </form>

              {/* Mobile Navigation */}
              <nav className="flex flex-col space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="text-sm font-medium py-2 px-4 rounded-md hover:bg-accent transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Mobile WhatsApp Button */}
              <a
                href={gerarLinkWhatsApp()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full bg-[#25d366] hover:bg-[#20ba5a] text-white">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Fale Conosco no WhatsApp
                </Button>
              </a>
            </div>
          )}
        </div>
      </header>
      <MarcasCarouselCompact marcas={marcas} />
    </>
  );
};
