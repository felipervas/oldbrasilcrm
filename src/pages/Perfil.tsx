import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Building2, Upload, Moon, Sun, MessageCircle, ChevronRight, Coins, Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { AppTour } from "@/components/AppTour";

export default function Perfil() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    meta_mensal: 0,
    empresa: "",
    cnpj_empresa: "",
    endereco_empresa: "",
    telefone_empresa: "",
    site_empresa: "",
    logo_url: "",
  });

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      if (data) {
        setForm({
          nome: data.nome || "",
          telefone: data.telefone || "",
          meta_mensal: Number(data.meta_mensal) || 0,
          empresa: data.empresa || "",
          cnpj_empresa: data.cnpj_empresa || "",
          endereco_empresa: data.endereco_empresa || "",
          telefone_empresa: data.telefone_empresa || "",
          site_empresa: data.site_empresa || "",
          logo_url: data.logo_url || "",
        });
      }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: form.nome,
        telefone: form.telefone,
        meta_mensal: form.meta_mensal,
        empresa: form.empresa,
        cnpj_empresa: form.cnpj_empresa,
        endereco_empresa: form.endereco_empresa,
        telefone_empresa: form.telefone_empresa,
        site_empresa: form.site_empresa,
        logo_url: form.logo_url,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar perfil"); return; }
    toast.success("Perfil atualizado!");
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `logos/${user.id}.${ext}`;

    // Try uploading to produtos bucket (reuse existing bucket)
    const { error: upErr } = await supabase.storage.from("produtos").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Erro ao enviar logo"); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("produtos").getPublicUrl(path);
    setForm(f => ({ ...f, logo_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Logo enviado!");
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const initials = form.nome ? form.nome.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const Field = ({ label, id, value, onChange, type = "text", placeholder = "" }: any) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-muted-foreground">{label}</Label>
      <Input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} className="bg-background" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-primary">Meu Perfil</h1>

      {/* Personal */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Dados Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={form.logo_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span><Upload className="h-3 w-3 mr-1" />{uploading ? "Enviando..." : "Alterar logo"}</span>
                </Button>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome" id="nome" value={form.nome} onChange={(e: any) => setForm(f => ({ ...f, nome: e.target.value }))} />
            <Field label="Telefone" id="telefone" value={form.telefone} onChange={(e: any) => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
            <Field label="Meta Mensal (R$)" id="meta_mensal" value={form.meta_mensal || ""} onChange={(e: any) => setForm(f => ({ ...f, meta_mensal: Number(e.target.value) || 0 }))} type="number" />
          </div>
        </CardContent>
      </Card>

      {/* Company */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Dados da Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Empresa" id="empresa" value={form.empresa} onChange={(e: any) => setForm(f => ({ ...f, empresa: e.target.value }))} />
            <Field label="CNPJ" id="cnpj_empresa" value={form.cnpj_empresa} onChange={(e: any) => setForm(f => ({ ...f, cnpj_empresa: e.target.value }))} />
            <Field label="Endereço" id="endereco_empresa" value={form.endereco_empresa} onChange={(e: any) => setForm(f => ({ ...f, endereco_empresa: e.target.value }))} className="sm:col-span-2" />
            <Field label="Telefone Empresa" id="telefone_empresa" value={form.telefone_empresa} onChange={(e: any) => setForm(f => ({ ...f, telefone_empresa: e.target.value }))} />
            <Field label="Site" id="site_empresa" value={form.site_empresa} onChange={(e: any) => setForm(f => ({ ...f, site_empresa: e.target.value }))} />
          </div>
        </CardContent>
      </Card>


      {/* Templates WhatsApp */}
      <Link to="/perfil/whatsapp-templates" className="block">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
              </div>
              <div>
                <p className="font-semibold text-sm">Templates de WhatsApp</p>
                <p className="text-xs text-muted-foreground">Personalize as mensagens enviadas aos clientes</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* Comissões e Metas */}
      <Link to="/comissoes" className="block">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary/15 flex items-center justify-center">
                <Coins className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Comissões e Metas</p>
                <p className="text-xs text-muted-foreground">Regras, metas mensais e resumo do mês</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm">Tema escuro</span>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDark} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <button
            onClick={() => setTourOpen(true)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary/15 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-secondary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Ver tour guiado</p>
                <p className="text-xs text-muted-foreground">Conheça as principais funções do sistema</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Salvando..." : "Salvar Perfil"}
      </Button>

      {/* Sobre */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-secondary/10 to-amber-50 dark:from-secondary/5 dark:to-secondary/10">
        <CardContent className="p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Info className="h-4 w-4 text-secondary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Sobre</span>
          </div>
          <p className="font-bold text-base text-foreground">
            Cellos CRM
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sistema de Gestão para Representantes Comerciais
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">v1.0.0 · © {new Date().getFullYear()} Cellos Representações</p>
        </CardContent>
      </Card>

      {tourOpen && <AppTour forceOpen onClose={() => setTourOpen(false)} />}
    </div>
  );
}
