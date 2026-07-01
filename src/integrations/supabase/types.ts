export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      amostras_enviadas: {
        Row: {
          cliente_id: string
          codigo_rastreio: string | null
          created_at: string
          created_by: string
          data_envio: string
          feedback_cliente: string | null
          forma_envio: string | null
          id: string
          observacoes: string | null
          opportunity_id: string | null
          produto_id: string
          produto_marca: string | null
          produto_nome: string
          quantidade: number
          status: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          codigo_rastreio?: string | null
          created_at?: string
          created_by: string
          data_envio?: string
          feedback_cliente?: string | null
          forma_envio?: string | null
          id?: string
          observacoes?: string | null
          opportunity_id?: string | null
          produto_id: string
          produto_marca?: string | null
          produto_nome: string
          quantidade?: number
          status?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          codigo_rastreio?: string | null
          created_at?: string
          created_by?: string
          data_envio?: string
          feedback_cliente?: string | null
          forma_envio?: string | null
          id?: string
          observacoes?: string | null
          opportunity_id?: string | null
          produto_id?: string
          produto_marca?: string | null
          produto_nome?: string
          quantidade?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amostras_enviadas_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          id: string
          name: string
          short_description: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          name: string
          short_description?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          short_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      catalogo_arquivos: {
        Row: {
          arquivo_url: string
          brand_id: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          arquivo_url: string
          brand_id: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          arquivo_url?: string
          brand_id?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_arquivos_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          cnpj_cpf: string | null
          created_at: string
          data_ultima_compra: string | null
          dias_ultima_compra: number | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          id_old_brasil: string | null
          ie: string | null
          inativado_em: string | null
          inscricao_estadual: string | null
          instagram: string | null
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          marcas_concorrentes: string | null
          motivo_inativacao: string | null
          municipio: string | null
          nome_contato: string | null
          nome_fantasia: string | null
          nome_loja: string
          numero: string | null
          observacoes: string | null
          pessoa_compras: string | null
          regime_tributario: string | null
          representante_id: string | null
          segmento: string | null
          status: string | null
          tags: string | null
          telefone: string | null
          tipo: string | null
          total_pedidos: number | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          data_ultima_compra?: string | null
          dias_ultima_compra?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          id_old_brasil?: string | null
          ie?: string | null
          inativado_em?: string | null
          inscricao_estadual?: string | null
          instagram?: string | null
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          marcas_concorrentes?: string | null
          motivo_inativacao?: string | null
          municipio?: string | null
          nome_contato?: string | null
          nome_fantasia?: string | null
          nome_loja: string
          numero?: string | null
          observacoes?: string | null
          pessoa_compras?: string | null
          regime_tributario?: string | null
          representante_id?: string | null
          segmento?: string | null
          status?: string | null
          tags?: string | null
          telefone?: string | null
          tipo?: string | null
          total_pedidos?: number | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          data_ultima_compra?: string | null
          dias_ultima_compra?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          id_old_brasil?: string | null
          ie?: string | null
          inativado_em?: string | null
          inscricao_estadual?: string | null
          instagram?: string | null
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          marcas_concorrentes?: string | null
          motivo_inativacao?: string | null
          municipio?: string | null
          nome_contato?: string | null
          nome_fantasia?: string | null
          nome_loja?: string
          numero?: string | null
          observacoes?: string | null
          pessoa_compras?: string | null
          regime_tributario?: string | null
          representante_id?: string | null
          segmento?: string | null
          status?: string | null
          tags?: string | null
          telefone?: string | null
          tipo?: string | null
          total_pedidos?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      followups: {
        Row: {
          assigned_to: string
          client_id: string
          created_at: string
          data_original: string | null
          due_date: string
          due_time: string | null
          foi_remarcado: boolean
          hora_original: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          status: string
          subject: string
          type: string | null
          updated_at: string
        }
        Insert: {
          assigned_to: string
          client_id: string
          created_at?: string
          data_original?: string | null
          due_date: string
          due_time?: string | null
          foi_remarcado?: boolean
          hora_original?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          status?: string
          subject: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          client_id?: string
          created_at?: string
          data_original?: string | null
          due_date?: string
          due_time?: string | null
          foi_remarcado?: boolean
          hora_original?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          status?: string
          subject?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "cliente_retencao_metrics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "followups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          interaction_date: string
          opportunity_id: string | null
          photo_url: string | null
          subject: string | null
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          interaction_date?: string
          opportunity_id?: string | null
          photo_url?: string | null
          subject?: string | null
          type?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          interaction_date?: string
          opportunity_id?: string | null
          photo_url?: string | null
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "cliente_retencao_metrics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_pedido: {
        Row: {
          desconto_pct: number
          id: string
          pedido_id: string
          preco_praticado: number
          preco_tabela: number
          preco_unitario: number
          produto_id: string | null
          produto_marca: string | null
          produto_nome: string | null
          quantidade: number
          referencia: string | null
          subtotal: number
          tabela_preco: string | null
          unidade_medida: string | null
        }
        Insert: {
          desconto_pct?: number
          id?: string
          pedido_id: string
          preco_praticado?: number
          preco_tabela?: number
          preco_unitario?: number
          produto_id?: string | null
          produto_marca?: string | null
          produto_nome?: string | null
          quantidade?: number
          referencia?: string | null
          subtotal?: number
          tabela_preco?: string | null
          unidade_medida?: string | null
        }
        Update: {
          desconto_pct?: number
          id?: string
          pedido_id?: string
          preco_praticado?: number
          preco_tabela?: number
          preco_unitario?: number
          produto_id?: string | null
          produto_marca?: string | null
          produto_nome?: string | null
          quantidade?: number
          referencia?: string | null
          subtotal?: number
          tabela_preco?: string | null
          unidade_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_mensais: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          meta_valor: number
          observacoes: string | null
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          meta_valor?: number
          observacoes?: string | null
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          meta_valor?: number
          observacoes?: string | null
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          lida: boolean
          mensagem: string | null
          metadata: Json
          opportunity_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          metadata?: Json
          opportunity_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          metadata?: Json
          opportunity_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          company_id: string
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          estimated_value: number
          expected_close_date: string | null
          id: string
          last_interaction_at: string | null
          loss_reason: string | null
          marcas_concorrentes: string | null
          next_action_at: string | null
          next_action_description: string | null
          notes: string | null
          owner_id: string
          probability: number
          regime_tributario: string | null
          stage_id: string
          status: string
          temperature: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          estimated_value?: number
          expected_close_date?: string | null
          id?: string
          last_interaction_at?: string | null
          loss_reason?: string | null
          marcas_concorrentes?: string | null
          next_action_at?: string | null
          next_action_description?: string | null
          notes?: string | null
          owner_id: string
          probability?: number
          regime_tributario?: string | null
          stage_id: string
          status?: string
          temperature?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          estimated_value?: number
          expected_close_date?: string | null
          id?: string
          last_interaction_at?: string | null
          loss_reason?: string | null
          marcas_concorrentes?: string | null
          next_action_at?: string | null
          next_action_description?: string | null
          notes?: string | null
          owner_id?: string
          probability?: number
          regime_tributario?: string | null
          stage_id?: string
          status?: string
          temperature?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "cliente_retencao_metrics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_brands: {
        Row: {
          brand_id: string
          id: string
          opportunity_id: string
        }
        Insert: {
          brand_id: string
          id?: string
          opportunity_id: string
        }
        Update: {
          brand_id?: string
          id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_brands_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_playbook_progress: {
        Row: {
          checklist_state: Json
          created_at: string
          id: string
          opportunity_id: string
          stage_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          checklist_state?: Json
          created_at?: string
          id?: string
          opportunity_id: string
          stage_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          checklist_state?: Json
          created_at?: string
          id?: string
          opportunity_id?: string
          stage_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_playbook_progress_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_playbook_progress_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_comissoes: {
        Row: {
          breakdown: Json
          calculado_em: string
          comissao_base: number
          comissao_bonus: number
          comissao_total: number
          created_at: string
          id: string
          pedido_id: string
          updated_at: string
          valor_bruto: number
          vendedor_id: string
        }
        Insert: {
          breakdown?: Json
          calculado_em?: string
          comissao_base?: number
          comissao_bonus?: number
          comissao_total?: number
          created_at?: string
          id?: string
          pedido_id: string
          updated_at?: string
          valor_bruto?: number
          vendedor_id: string
        }
        Update: {
          breakdown?: Json
          calculado_em?: string
          comissao_base?: number
          comissao_bonus?: number
          comissao_total?: number
          created_at?: string
          id?: string
          pedido_id?: string
          updated_at?: string
          valor_bruto?: number
          vendedor_id?: string
        }
        Relationships: []
      }
      pedido_parcelas: {
        Row: {
          created_at: string
          id: string
          numero_parcela: number
          observacoes: string | null
          pago_em: string | null
          pedido_id: string
          status: string
          total_parcelas: number
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          created_at?: string
          id?: string
          numero_parcela: number
          observacoes?: string | null
          pago_em?: string | null
          pedido_id: string
          status?: string
          total_parcelas: number
          updated_at?: string
          valor?: number
          vencimento: string
        }
        Update: {
          created_at?: string
          id?: string
          numero_parcela?: number
          observacoes?: string | null
          pago_em?: string | null
          pedido_id?: string
          status?: string
          total_parcelas?: number
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          cliente_id: string
          cliente_nome: string | null
          created_at: string
          data_conclusao: string | null
          desconto: number
          desconto_geral_pct: number
          desconto_geral_valor: number
          enviado_at: string | null
          feedback_followup_id: string | null
          forma_pagamento: string | null
          frete: number
          frete_valor: number
          id: string
          identificador: string | null
          nota_fiscal: string | null
          numero: string | null
          observacoes: string | null
          ordem_compra: string | null
          origem: string | null
          parcelas_modo_pdf: string
          parcelas_visivel_pdf: boolean
          prazo_pagamento: string | null
          previsao_entrega: string | null
          qtd_itens: number | null
          representante_id: string
          situacao: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          subtotal: number
          tipo: string | null
          transporte: string | null
          valor_total: number
          vendedor_id: string | null
        }
        Insert: {
          cliente_id: string
          cliente_nome?: string | null
          created_at?: string
          data_conclusao?: string | null
          desconto?: number
          desconto_geral_pct?: number
          desconto_geral_valor?: number
          enviado_at?: string | null
          feedback_followup_id?: string | null
          forma_pagamento?: string | null
          frete?: number
          frete_valor?: number
          id?: string
          identificador?: string | null
          nota_fiscal?: string | null
          numero?: string | null
          observacoes?: string | null
          ordem_compra?: string | null
          origem?: string | null
          parcelas_modo_pdf?: string
          parcelas_visivel_pdf?: boolean
          prazo_pagamento?: string | null
          previsao_entrega?: string | null
          qtd_itens?: number | null
          representante_id: string
          situacao?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          subtotal?: number
          tipo?: string | null
          transporte?: string | null
          valor_total?: number
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string
          cliente_nome?: string | null
          created_at?: string
          data_conclusao?: string | null
          desconto?: number
          desconto_geral_pct?: number
          desconto_geral_valor?: number
          enviado_at?: string | null
          feedback_followup_id?: string | null
          forma_pagamento?: string | null
          frete?: number
          frete_valor?: number
          id?: string
          identificador?: string | null
          nota_fiscal?: string | null
          numero?: string | null
          observacoes?: string | null
          ordem_compra?: string | null
          origem?: string | null
          parcelas_modo_pdf?: string
          parcelas_visivel_pdf?: boolean
          prazo_pagamento?: string | null
          previsao_entrega?: string | null
          qtd_itens?: number | null
          representante_id?: string
          situacao?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          subtotal?: number
          tipo?: string | null
          transporte?: string | null
          valor_total?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente_retencao_metrics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          default_probability: number
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          default_probability?: number
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          default_probability?: number
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      playbook_respostas: {
        Row: {
          created_at: string
          id: string
          item_checklist: string
          opportunity_id: string
          respondido_em: string
          respondido_por: string | null
          resposta: Json
          stage_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_checklist: string
          opportunity_id: string
          respondido_em?: string
          respondido_por?: string | null
          resposta?: Json
          stage_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_checklist?: string
          opportunity_id?: string
          respondido_em?: string
          respondido_por?: string | null
          resposta?: Json
          stage_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      playbook_scripts: {
        Row: {
          checklist: Json
          created_at: string
          criterio_avanco: string
          id: string
          objecoes: Json
          objetivo: string
          perguntas_chave: Json
          script_abordagem: Json
          stage_id: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          criterio_avanco?: string
          id?: string
          objecoes?: Json
          objetivo?: string
          perguntas_chave?: Json
          script_abordagem?: Json
          stage_id: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          criterio_avanco?: string
          id?: string
          objecoes?: Json
          objetivo?: string
          perguntas_chave?: Json
          script_abordagem?: Json
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_scripts_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: true
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string
          codigo_referencia: string | null
          created_at: string
          descricao_detalhada: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          peso_liquido: number | null
          price: number
          unidade_medida: string | null
          unit: string | null
          updated_at: string
          volume: number | null
        }
        Insert: {
          brand_id: string
          codigo_referencia?: string | null
          created_at?: string
          descricao_detalhada?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          peso_liquido?: number | null
          price?: number
          unidade_medida?: string | null
          unit?: string | null
          updated_at?: string
          volume?: number | null
        }
        Update: {
          brand_id?: string
          codigo_referencia?: string | null
          created_at?: string
          descricao_detalhada?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          peso_liquido?: number | null
          price?: number
          unidade_medida?: string | null
          unit?: string | null
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_precos: {
        Row: {
          created_at: string
          id: string
          preco: number
          produto_id: string
          tipo_tabela: Database["public"]["Enums"]["tipo_tabela_preco"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          preco?: number
          produto_id: string
          tipo_tabela: Database["public"]["Enums"]["tipo_tabela_preco"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          preco?: number
          produto_id?: string
          tipo_tabela?: Database["public"]["Enums"]["tipo_tabela_preco"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: Database["public"]["Enums"]["categoria_produto"]
          codigo_referencia: string | null
          codigo_sku: string | null
          created_at: string
          descricao: string | null
          descricao_detalhada: string | null
          id: string
          id_old_brasil: string | null
          imagem_url: string | null
          marca: string | null
          nome: string
          observacoes: string | null
          peso_liquido: number | null
          preco: number
          referencia: string | null
          saldo_estoque: number | null
          subcategoria: string | null
          unidade: Database["public"]["Enums"]["unidade_produto"]
          unidade_medida: string | null
          updated_at: string
          volume: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_produto"]
          codigo_referencia?: string | null
          codigo_sku?: string | null
          created_at?: string
          descricao?: string | null
          descricao_detalhada?: string | null
          id?: string
          id_old_brasil?: string | null
          imagem_url?: string | null
          marca?: string | null
          nome: string
          observacoes?: string | null
          peso_liquido?: number | null
          preco?: number
          referencia?: string | null
          saldo_estoque?: number | null
          subcategoria?: string | null
          unidade?: Database["public"]["Enums"]["unidade_produto"]
          unidade_medida?: string | null
          updated_at?: string
          volume?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_produto"]
          codigo_referencia?: string | null
          codigo_sku?: string | null
          created_at?: string
          descricao?: string | null
          descricao_detalhada?: string | null
          id?: string
          id_old_brasil?: string | null
          imagem_url?: string | null
          marca?: string | null
          nome?: string
          observacoes?: string | null
          peso_liquido?: number | null
          preco?: number
          referencia?: string | null
          saldo_estoque?: number | null
          subcategoria?: string | null
          unidade?: Database["public"]["Enums"]["unidade_produto"]
          unidade_medida?: string | null
          updated_at?: string
          volume?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cnpj_empresa: string | null
          created_at: string
          email: string
          empresa: string | null
          endereco_empresa: string | null
          id: string
          logo_url: string | null
          meta_mensal: number | null
          nome: string
          role: string
          site_empresa: string | null
          telefone: string | null
          telefone_empresa: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj_empresa?: string | null
          created_at?: string
          email?: string
          empresa?: string | null
          endereco_empresa?: string | null
          id?: string
          logo_url?: string | null
          meta_mensal?: number | null
          nome?: string
          role?: string
          site_empresa?: string | null
          telefone?: string | null
          telefone_empresa?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj_empresa?: string | null
          created_at?: string
          email?: string
          empresa?: string | null
          endereco_empresa?: string | null
          id?: string
          logo_url?: string | null
          meta_mensal?: number | null
          nome?: string
          role?: string
          site_empresa?: string | null
          telefone?: string | null
          telefone_empresa?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qualificacao_bant: {
        Row: {
          authority_cargo: string | null
          authority_nome: string | null
          budget_texto: string | null
          budget_valor_estimado: number | null
          created_at: string
          id: string
          need_descricao: string | null
          observacoes: string | null
          opportunity_id: string
          timing_data: string | null
          timing_tipo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          authority_cargo?: string | null
          authority_nome?: string | null
          budget_texto?: string | null
          budget_valor_estimado?: number | null
          created_at?: string
          id?: string
          need_descricao?: string | null
          observacoes?: string | null
          opportunity_id: string
          timing_data?: string | null
          timing_tipo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          authority_cargo?: string | null
          authority_nome?: string | null
          budget_texto?: string | null
          budget_valor_estimado?: number | null
          created_at?: string
          id?: string
          need_descricao?: string | null
          observacoes?: string | null
          opportunity_id?: string
          timing_data?: string | null
          timing_tipo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      regras_comissao: {
        Row: {
          alvo_id: string | null
          alvo_nome: string | null
          ativo: boolean
          created_at: string
          id: string
          meta_percentual_min: number | null
          nome: string
          percentual: number
          tipo: string
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          alvo_id?: string | null
          alvo_nome?: string | null
          ativo?: boolean
          created_at?: string
          id?: string
          meta_percentual_min?: number | null
          nome: string
          percentual?: number
          tipo: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          alvo_id?: string | null
          alvo_nome?: string | null
          ativo?: boolean
          created_at?: string
          id?: string
          meta_percentual_min?: number | null
          nome?: string
          percentual?: number
          tipo?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      rotas: {
        Row: {
          cliente_id: string
          created_at: string
          data_visita: string
          horario: string | null
          id: string
          observacoes: string | null
          representante_id: string
          status: Database["public"]["Enums"]["visita_status"]
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_visita: string
          horario?: string | null
          id?: string
          observacoes?: string | null
          representante_id: string
          status?: Database["public"]["Enums"]["visita_status"]
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_visita?: string
          horario?: string | null
          id?: string
          observacoes?: string | null
          representante_id?: string
          status?: Database["public"]["Enums"]["visita_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente_retencao_metrics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "rotas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          company_id: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json | null
          opportunity_id: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          opportunity_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          opportunity_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "cliente_retencao_metrics"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "timeline_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitas: {
        Row: {
          check_in_at: string
          check_out_at: string | null
          cliente_id: string
          created_at: string
          data_visita: string
          endereco_aprox: string | null
          id: string
          latitude: number | null
          longitude: number | null
          motivo: string | null
          observacoes: string | null
          pedido_id: string | null
          resultado: string
          rota_id: string | null
          status: string
          updated_at: string
          valor_gerado: number
          vendedor_id: string
        }
        Insert: {
          check_in_at?: string
          check_out_at?: string | null
          cliente_id: string
          created_at?: string
          data_visita?: string
          endereco_aprox?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          motivo?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          resultado?: string
          rota_id?: string | null
          status?: string
          updated_at?: string
          valor_gerado?: number
          vendedor_id: string
        }
        Update: {
          check_in_at?: string
          check_out_at?: string | null
          cliente_id?: string
          created_at?: string
          data_visita?: string
          endereco_aprox?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          motivo?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          resultado?: string
          rota_id?: string | null
          status?: string
          updated_at?: string
          valor_gerado?: number
          vendedor_id?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          ativo: boolean
          chave: string
          conteudo: string
          created_at: string
          descricao: string | null
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          conteudo: string
          created_at?: string
          descricao?: string | null
          id?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          conteudo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      cliente_retencao_metrics: {
        Row: {
          cliente_id: string | null
          dias_desde_ultima_compra: number | null
          intervalo_medio_dias: number | null
          total_pedidos: number | null
          ultima_compra_data: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      fix_mojibake_mac: { Args: { t: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_gestor: { Args: { _user_id: string }; Returns: boolean }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "gestor" | "vendedor"
      categoria_produto:
        | "Cacau"
        | "Base Gelato"
        | "Confeitaria"
        | "Embalagens"
        | "Outros"
      pedido_status: "Rascunho" | "Enviado" | "Confirmado"
      tipo_tabela_preco:
        | "tabela_1"
        | "tabela_2"
        | "tabela_3"
        | "tabela_4"
        | "distribuidor"
      unidade_produto: "kg" | "un" | "cx" | "lt"
      visita_status: "pendente" | "visitado" | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "vendedor"],
      categoria_produto: [
        "Cacau",
        "Base Gelato",
        "Confeitaria",
        "Embalagens",
        "Outros",
      ],
      pedido_status: ["Rascunho", "Enviado", "Confirmado"],
      tipo_tabela_preco: [
        "tabela_1",
        "tabela_2",
        "tabela_3",
        "tabela_4",
        "distribuidor",
      ],
      unidade_produto: ["kg", "un", "cx", "lt"],
      visita_status: ["pendente", "visitado", "cancelado"],
    },
  },
} as const
