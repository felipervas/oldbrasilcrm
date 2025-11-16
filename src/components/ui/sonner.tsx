import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white/90 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-l-4 group-[.toaster]:border-[hsl(142_76%_45%)]",
          error: "group-[.toaster]:border-l-4 group-[.toaster]:border-[hsl(0_84%_60%)]",
          warning: "group-[.toaster]:border-l-4 group-[.toaster]:border-[hsl(38_92%_50%)]",
          info: "group-[.toaster]:border-l-4 group-[.toaster]:border-[hsl(262_83%_58%)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
