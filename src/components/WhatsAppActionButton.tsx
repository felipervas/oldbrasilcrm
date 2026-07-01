import * as React from "react";
import { toast } from "sonner";

import { openWhatsApp } from "@/lib/whatsapp";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WhatsAppActionButtonProps extends Omit<ButtonProps, "onClick"> {
  phone: string | null | undefined;
  message?: string;
  noPhoneTooltip?: string;
  invalidPhoneMessage?: string;
}

export function WhatsAppActionButton({
  phone,
  message,
  noPhoneTooltip = "Sem telefone cadastrado",
  invalidPhoneMessage = "Telefone inválido para WhatsApp.",
  disabled,
  type = "button",
  children,
  ...props
}: WhatsAppActionButtonProps) {
  const isDisabled = disabled || !phone;

  const button = (
    <Button
      {...props}
      type={type}
      disabled={isDisabled}
      onClick={() => {
        if (!openWhatsApp(phone, message)) {
          toast.error(invalidPhoneMessage);
        }
      }}
    >
      {children}
    </Button>
  );

  if (!phone) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent>{noPhoneTooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}