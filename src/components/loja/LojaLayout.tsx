import { ReactNode } from "react";
import { LojaHeader } from "./LojaHeader";
import { LojaFooter } from "./LojaFooter";
import { WhatsAppButton } from "./WhatsAppButton";

export function LojaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <LojaHeader />
      <main className="flex-1">{children}</main>
      <LojaFooter />
      <WhatsAppButton />
    </div>
  );
}
