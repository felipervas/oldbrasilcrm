import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";
import logo from "@/assets/old-brasil-logo.png";

export const LojaFooter = () => {
  return (
    <footer className="bg-muted/50 border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo e Descrição */}
          <div className="space-y-4">
            <img src={logo} alt="OLD BRASIL" className="h-12 w-auto" />
            <p className="text-sm text-muted-foreground">
              Produtos premium para sorveterias e confeitarias.
            </p>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="font-semibold mb-4">Links Rápidos</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                to="/loja"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Produtos
              </Link>
              <Link
                to="/loja/marcas"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Marcas
              </Link>
            </nav>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-semibold mb-4">Contato</h3>
            <div className="space-y-2">
              <a
                href={gerarLinkWhatsApp()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-muted-foreground hover:text-[#25d366] transition-colors"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                (47) 99262-0525
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} OLD BRASIL. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
