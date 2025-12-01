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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      amostras: {
        Row: {
          cliente_id: string
          created_at: string
          data_entrega: string
          id: string
          observacoes: string | null
          origem_saida: string | null
          produto_id: string
          quantidade: number
          responsavel_id: string
          retorno: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_entrega?: string
          id?: string
          observacoes?: string | null
          origem_saida?: string | null
          produto_id: string
          quantidade: number
          responsavel_id: string
          retorno?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_entrega?: string
          id?: string
          observacoes?: string | null
          origem_saida?: string | null
          produto_id?: string
          quantidade?: number
          responsavel_id?: string
          retorno?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amostras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amostras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "amostras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string | null
          detalhes: Json | null
          entidade_id: string | null
          entidade_tipo: string
          id: string
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          detalhes?: Json | null
          entidade_id?: string | null
          entidade_tipo: string
          id?: string
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          detalhes?: Json | null
          entidade_id?: string | null
          entidade_tipo?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      catalogos: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          created_at: string
          descricao: string | null
          id: string
          marca_id: string | null
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          created_at?: string
          descricao?: string | null
          id?: string
          marca_id?: string | null
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          created_at?: string
          descricao?: string | null
          id?: string
          marca_id?: string | null
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_marcas"
            referencedColumns: ["marca_id"]
          },
        ]
      }
      cliente_historico: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          observacao: string
          referencia_id: string | null
          tipo: string
          usuario_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          observacao: string
          referencia_id?: string | null
          tipo?: string
          usuario_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          observacao?: string
          referencia_id?: string | null
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_historico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_historico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      cliente_produtos: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          produto_id: string
          status_interesse: Database["public"]["Enums"]["interest_status"]
          ultimo_pedido_data: string | null
          updated_at: string
          volume_medio: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          produto_id: string
          status_interesse?: Database["public"]["Enums"]["interest_status"]
          ultimo_pedido_data?: string | null
          updated_at?: string
          volume_medio?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          produto_id?: string
          status_interesse?: Database["public"]["Enums"]["interest_status"]
          ultimo_pedido_data?: string | null
          updated_at?: string
          volume_medio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_produtos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_produtos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "cliente_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          aniversario: string | null
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          compra_mensal_media: number | null
          created_at: string
          email: string | null
          historico_pedidos: string | null
          id: string
          logradouro: string | null
          nome_fantasia: string
          numero: string | null
          observacoes: string | null
          prospect_data_criacao: string | null
          prospect_observacoes_iniciais: string | null
          prospect_origem_id: string | null
          prospect_status_origem: string | null
          razao_social: string | null
          referencia: string | null
          responsavel_id: string | null
          segmento: string | null
          tags: string[] | null
          tamanho: string | null
          telefone: string | null
          total_comprado: number | null
          total_pedidos: number | null
          uf: string | null
          ultima_compra_data: string | null
          updated_at: string
        }
        Insert: {
          aniversario?: string | null
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          compra_mensal_media?: number | null
          created_at?: string
          email?: string | null
          historico_pedidos?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia: string
          numero?: string | null
          observacoes?: string | null
          prospect_data_criacao?: string | null
          prospect_observacoes_iniciais?: string | null
          prospect_origem_id?: string | null
          prospect_status_origem?: string | null
          razao_social?: string | null
          referencia?: string | null
          responsavel_id?: string | null
          segmento?: string | null
          tags?: string[] | null
          tamanho?: string | null
          telefone?: string | null
          total_comprado?: number | null
          total_pedidos?: number | null
          uf?: string | null
          ultima_compra_data?: string | null
          updated_at?: string
        }
        Update: {
          aniversario?: string | null
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          compra_mensal_media?: number | null
          created_at?: string
          email?: string | null
          historico_pedidos?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string
          numero?: string | null
          observacoes?: string | null
          prospect_data_criacao?: string | null
          prospect_observacoes_iniciais?: string | null
          prospect_origem_id?: string | null
          prospect_status_origem?: string | null
          razao_social?: string | null
          referencia?: string | null
          responsavel_id?: string | null
          segmento?: string | null
          tags?: string[] | null
          tamanho?: string | null
          telefone?: string | null
          total_comprado?: number | null
          total_pedidos?: number | null
          uf?: string | null
          ultima_compra_data?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_prospect_origem_id_fkey"
            columns: ["prospect_origem_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_prospect_origem_id_fkey"
            columns: ["prospect_origem_id"]
            isOneToOne: false
            referencedRelation: "prospects_with_last_interaction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "mv_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "clientes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
        ]
      }
      colaborador_eventos: {
        Row: {
          colaborador_id: string
          comentario: string | null
          concluido: boolean | null
          created_at: string
          data: string
          descricao: string | null
          horario: string | null
          id: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          comentario?: string | null
          concluido?: boolean | null
          created_at?: string
          data: string
          descricao?: string | null
          horario?: string | null
          id?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          comentario?: string | null
          concluido?: boolean | null
          created_at?: string
          data?: string
          descricao?: string | null
          horario?: string | null
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          comentario: string
          created_at: string | null
          entidade_id: string
          entidade_tipo: string
          id: string
          usuario_id: string
        }
        Insert: {
          comentario: string
          created_at?: string | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          usuario_id: string
        }
        Update: {
          comentario?: string
          created_at?: string | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      contatos_clientes: {
        Row: {
          aniversario: string | null
          cargo: string | null
          cliente_id: string
          created_at: string | null
          email: string | null
          fonte: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo_contato: string | null
          updated_at: string | null
          verificado: boolean | null
        }
        Insert: {
          aniversario?: string | null
          cargo?: string | null
          cliente_id: string
          created_at?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo_contato?: string | null
          updated_at?: string | null
          verificado?: boolean | null
        }
        Update: {
          aniversario?: string | null
          cargo?: string | null
          cliente_id?: string
          created_at?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo_contato?: string | null
          updated_at?: string | null
          verificado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      financeiro: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          beneficiario: string | null
          categoria: string | null
          codigo_barras: string | null
          created_at: string
          data: string
          data_vencimento: string | null
          descricao: string
          id: string
          observacoes: string | null
          status_pagamento: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          tipo_transacao: string | null
          updated_at: string
          usuario_id: string
          valor: number
          valor_boleto: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          beneficiario?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          data?: string
          data_vencimento?: string | null
          descricao: string
          id?: string
          observacoes?: string | null
          status_pagamento?: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          tipo_transacao?: string | null
          updated_at?: string
          usuario_id: string
          valor: number
          valor_boleto?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          beneficiario?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          data?: string
          data_vencimento?: string | null
          descricao?: string
          id?: string
          observacoes?: string | null
          status_pagamento?: string | null
          tipo?: Database["public"]["Enums"]["transaction_type"]
          tipo_transacao?: string | null
          updated_at?: string
          usuario_id?: string
          valor?: number
          valor_boleto?: number | null
        }
        Relationships: []
      }
      historico_equipe: {
        Row: {
          acao: string
          created_at: string | null
          detalhes: Json | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          detalhes?: Json | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          detalhes?: Json | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      interacoes: {
        Row: {
          cliente_id: string
          comentario: string | null
          created_at: string
          data_hora: string
          duracao_min: number | null
          id: string
          motivo: string | null
          resultado: Database["public"]["Enums"]["interaction_result"]
          sentimento: Database["public"]["Enums"]["sentiment_type"] | null
          tipo: Database["public"]["Enums"]["interaction_type"]
          updated_at: string
          usuario_id: string
        }
        Insert: {
          cliente_id: string
          comentario?: string | null
          created_at?: string
          data_hora?: string
          duracao_min?: number | null
          id?: string
          motivo?: string | null
          resultado?: Database["public"]["Enums"]["interaction_result"]
          sentimento?: Database["public"]["Enums"]["sentiment_type"] | null
          tipo: Database["public"]["Enums"]["interaction_type"]
          updated_at?: string
          usuario_id: string
        }
        Update: {
          cliente_id?: string
          comentario?: string | null
          created_at?: string
          data_hora?: string
          duracao_min?: number | null
          id?: string
          motivo?: string | null
          resultado?: Database["public"]["Enums"]["interaction_result"]
          sentimento?: Database["public"]["Enums"]["sentiment_type"] | null
          tipo?: Database["public"]["Enums"]["interaction_type"]
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "mv_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
        ]
      }
      leads_landing: {
        Row: {
          created_at: string | null
          email: string
          empresa: string
          id: string
          mensagem: string | null
          nome: string
          origem: string | null
          status: string | null
          telefone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          empresa: string
          id?: string
          mensagem?: string | null
          nome: string
          origem?: string | null
          status?: string | null
          telefone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          empresa?: string
          id?: string
          mensagem?: string | null
          nome?: string
          origem?: string | null
          status?: string | null
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      loja_audit_log: {
        Row: {
          acao: string
          created_at: string | null
          detalhes: Json | null
          entidade_id: string | null
          entidade_tipo: string
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          detalhes?: Json | null
          entidade_id?: string | null
          entidade_tipo: string
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          detalhes?: Json | null
          entidade_id?: string | null
          entidade_tipo?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      loja_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          mensagem: string | null
          nome: string
          origem: string | null
          telefone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          mensagem?: string | null
          nome: string
          origem?: string | null
          telefone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          mensagem?: string | null
          nome?: string
          origem?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      marca_contatos: {
        Row: {
          cargo: string | null
          created_at: string | null
          email: string | null
          id: string
          marca_id: string | null
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          marca_id?: string | null
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          marca_id?: string | null
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marca_contatos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marca_contatos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_marcas"
            referencedColumns: ["marca_id"]
          },
        ]
      }
      marcas: {
        Row: {
          ativa: boolean
          banner_altura: number | null
          banner_cor: string | null
          banner_largura: number | null
          banner_object_fit: string | null
          created_at: string
          descricao: string | null
          id: string
          imagem_banner: string | null
          logo_url: string | null
          mostrar_texto_banner: boolean | null
          nome: string
          site: string | null
          slug: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativa?: boolean
          banner_altura?: number | null
          banner_cor?: string | null
          banner_largura?: number | null
          banner_object_fit?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_banner?: string | null
          logo_url?: string | null
          mostrar_texto_banner?: boolean | null
          nome: string
          site?: string | null
          slug?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativa?: boolean
          banner_altura?: number | null
          banner_cor?: string | null
          banner_largura?: number | null
          banner_object_fit?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_banner?: string | null
          logo_url?: string | null
          mostrar_texto_banner?: boolean | null
          nome?: string
          site?: string | null
          slug?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      movimentacao_estoque: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          responsavel_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          responsavel_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          responsavel_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacao_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          cliente_id: string
          created_at: string | null
          data_entrega_realizada: string | null
          data_pedido: string | null
          data_previsao_entrega: string | null
          dias_pagamento: string | null
          forma_pagamento: string | null
          id: string
          numero_pedido: string | null
          observacoes: string | null
          observacoes_entrega: string | null
          observacoes_internas: string | null
          parcelas: number | null
          responsavel_venda_id: string | null
          status: string | null
          tipo_frete: string | null
          transportadora: string | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          cliente_id: string
          created_at?: string | null
          data_entrega_realizada?: string | null
          data_pedido?: string | null
          data_previsao_entrega?: string | null
          dias_pagamento?: string | null
          forma_pagamento?: string | null
          id?: string
          numero_pedido?: string | null
          observacoes?: string | null
          observacoes_entrega?: string | null
          observacoes_internas?: string | null
          parcelas?: number | null
          responsavel_venda_id?: string | null
          status?: string | null
          tipo_frete?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          cliente_id?: string
          created_at?: string | null
          data_entrega_realizada?: string | null
          data_pedido?: string | null
          data_previsao_entrega?: string | null
          dias_pagamento?: string | null
          forma_pagamento?: string | null
          id?: string
          numero_pedido?: string | null
          observacoes?: string | null
          observacoes_entrega?: string | null
          observacoes_internas?: string | null
          parcelas?: number | null
          responsavel_venda_id?: string | null
          status?: string | null
          tipo_frete?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "pedidos_responsavel_venda_id_fkey"
            columns: ["responsavel_venda_id"]
            isOneToOne: false
            referencedRelation: "mv_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "pedidos_responsavel_venda_id_fkey"
            columns: ["responsavel_venda_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_responsavel_venda_id_fkey"
            columns: ["responsavel_venda_id"]
            isOneToOne: false
            referencedRelation: "v_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
        ]
      }
      pedidos_produtos: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          pedido_id: string | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          tabela_preco_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          tabela_preco_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          tabela_preco_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_produtos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_produtos_tabela_preco_id_fkey"
            columns: ["tabela_preco_id"]
            isOneToOne: false
            referencedRelation: "produto_tabelas_preco"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_imagens: {
        Row: {
          altura: number | null
          created_at: string
          id: string
          largura: number | null
          object_fit: string | null
          ordem: number | null
          produto_id: string
          url: string
        }
        Insert: {
          altura?: number | null
          created_at?: string
          id?: string
          largura?: number | null
          object_fit?: string | null
          ordem?: number | null
          produto_id: string
          url: string
        }
        Update: {
          altura?: number | null
          created_at?: string
          id?: string
          largura?: number | null
          object_fit?: string | null
          ordem?: number | null
          produto_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_tabelas_preco: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome_tabela: string
          preco_por_kg: number | null
          produto_id: string
          unidade_medida: string | null
          updated_at: string
          usar_no_site: boolean | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_tabela: string
          preco_por_kg?: number | null
          produto_id: string
          unidade_medida?: string | null
          updated_at?: string
          usar_no_site?: boolean | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome_tabela?: string
          preco_por_kg?: number | null
          produto_id?: string
          unidade_medida?: string | null
          updated_at?: string
          usar_no_site?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_tabelas_preco_produto_id_fkey"
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
          categoria: string | null
          created_at: string
          descricao: string | null
          destaque_loja: boolean | null
          estoque_escritorio: number | null
          id: string
          marca_id: string | null
          nome: string
          nome_loja: string | null
          ordem_exibicao: number | null
          peso_embalagem_kg: number | null
          peso_unidade_kg: number | null
          preco_atualizado_em: string | null
          preco_base: number | null
          preco_por_kg: number | null
          rendimento_dose_gramas: number | null
          subcategoria: string | null
          submarca: string | null
          tabela_preco_loja_id: string | null
          tipo_calculo: string | null
          tipo_embalagem: string | null
          tipo_venda: string
          updated_at: string
          visivel_loja: boolean | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          destaque_loja?: boolean | null
          estoque_escritorio?: number | null
          id?: string
          marca_id?: string | null
          nome: string
          nome_loja?: string | null
          ordem_exibicao?: number | null
          peso_embalagem_kg?: number | null
          peso_unidade_kg?: number | null
          preco_atualizado_em?: string | null
          preco_base?: number | null
          preco_por_kg?: number | null
          rendimento_dose_gramas?: number | null
          subcategoria?: string | null
          submarca?: string | null
          tabela_preco_loja_id?: string | null
          tipo_calculo?: string | null
          tipo_embalagem?: string | null
          tipo_venda?: string
          updated_at?: string
          visivel_loja?: boolean | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          destaque_loja?: boolean | null
          estoque_escritorio?: number | null
          id?: string
          marca_id?: string | null
          nome?: string
          nome_loja?: string | null
          ordem_exibicao?: number | null
          peso_embalagem_kg?: number | null
          peso_unidade_kg?: number | null
          preco_atualizado_em?: string | null
          preco_base?: number | null
          preco_por_kg?: number | null
          rendimento_dose_gramas?: number | null
          subcategoria?: string | null
          submarca?: string | null
          tabela_preco_loja_id?: string | null
          tipo_calculo?: string | null
          tipo_embalagem?: string | null
          tipo_venda?: string
          updated_at?: string
          visivel_loja?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_marcas"
            referencedColumns: ["marca_id"]
          },
          {
            foreignKeyName: "produtos_tabela_preco_loja_id_fkey"
            columns: ["tabela_preco_loja_id"]
            isOneToOne: false
            referencedRelation: "produto_tabelas_preco"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          emails: Json | null
          equipe: string | null
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["user_role"]
          telefone: string | null
          telefones: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          emails?: Json | null
          equipe?: string | null
          id: string
          nome: string
          perfil?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          telefones?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          emails?: Json | null
          equipe?: string | null
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          telefones?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      prospect_ia_insights: {
        Row: {
          dicas_abordagem: string[] | null
          gerado_em: string | null
          id: string
          informacoes_publicas: string | null
          produtos_recomendados: string[] | null
          prospect_id: string | null
          resumo_empresa: string | null
          updated_at: string | null
        }
        Insert: {
          dicas_abordagem?: string[] | null
          gerado_em?: string | null
          id?: string
          informacoes_publicas?: string | null
          produtos_recomendados?: string[] | null
          prospect_id?: string | null
          resumo_empresa?: string | null
          updated_at?: string | null
        }
        Update: {
          dicas_abordagem?: string[] | null
          gerado_em?: string | null
          id?: string
          informacoes_publicas?: string | null
          produtos_recomendados?: string[] | null
          prospect_id?: string | null
          resumo_empresa?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_ia_insights_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: true
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_ia_insights_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: true
            referencedRelation: "prospects_with_last_interaction"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_interacoes: {
        Row: {
          created_at: string
          data_interacao: string
          descricao: string
          id: string
          prospect_id: string
          proximo_passo: string | null
          resultado: string | null
          tipo_interacao: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          data_interacao?: string
          descricao: string
          id?: string
          prospect_id: string
          proximo_passo?: string | null
          resultado?: string | null
          tipo_interacao: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          data_interacao?: string
          descricao?: string
          id?: string
          prospect_id?: string
          proximo_passo?: string | null
          resultado?: string | null
          tipo_interacao?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_interacoes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_interacoes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects_with_last_interaction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "mv_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "prospect_interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
        ]
      }
      prospect_visitas: {
        Row: {
          created_at: string
          data_visita: string
          distancia_km: number | null
          evento_id: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          observacoes: string | null
          ordem_rota: number | null
          prospect_id: string
          responsavel_id: string
          status: string
          tempo_trajeto_min: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_visita: string
          distancia_km?: number | null
          evento_id?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          observacoes?: string | null
          ordem_rota?: number | null
          prospect_id: string
          responsavel_id: string
          status?: string
          tempo_trajeto_min?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_visita?: string
          distancia_km?: number | null
          evento_id?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          observacoes?: string | null
          ordem_rota?: number | null
          prospect_id?: string
          responsavel_id?: string
          status?: string
          tempo_trajeto_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_visitas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "colaborador_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_visitas_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_visitas_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects_with_last_interaction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_visitas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "mv_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "prospect_visitas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_visitas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
        ]
      }
      prospects: {
        Row: {
          cep: string | null
          cidade: string | null
          convertido_cliente_id: string | null
          created_at: string
          criado_por_id: string | null
          data_proximo_contato: string | null
          data_ultimo_contato: string | null
          email: string | null
          endereco_completo: string | null
          estado: string | null
          id: string
          latitude: number | null
          longitude: number | null
          motivo_perda: string | null
          nome_empresa: string
          observacoes: string | null
          origem: string | null
          porte: string | null
          prioridade: string
          produto_utilizado: string | null
          responsavel_id: string | null
          score: number | null
          score_atualizado_em: string | null
          segmento: string | null
          site: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          convertido_cliente_id?: string | null
          created_at?: string
          criado_por_id?: string | null
          data_proximo_contato?: string | null
          data_ultimo_contato?: string | null
          email?: string | null
          endereco_completo?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          motivo_perda?: string | null
          nome_empresa: string
          observacoes?: string | null
          origem?: string | null
          porte?: string | null
          prioridade?: string
          produto_utilizado?: string | null
          responsavel_id?: string | null
          score?: number | null
          score_atualizado_em?: string | null
          segmento?: string | null
          site?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          convertido_cliente_id?: string | null
          created_at?: string
          criado_por_id?: string | null
          data_proximo_contato?: string | null
          data_ultimo_contato?: string | null
          email?: string | null
          endereco_completo?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          motivo_perda?: string | null
          nome_empresa?: string
          observacoes?: string | null
          origem?: string | null
          porte?: string | null
          prioridade?: string
          produto_utilizado?: string | null
          responsavel_id?: string | null
          score?: number | null
          score_atualizado_em?: string | null
          segmento?: string | null
          site?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_convertido_cliente_id_fkey"
            columns: ["convertido_cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_convertido_cliente_id_fkey"
            columns: ["convertido_cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "mv_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
        ]
      }
      receitas: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          categoria: string | null
          cliente_id: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      tarefas: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_conclusao: string | null
          data_prevista: string | null
          descricao: string | null
          endereco_completo: string | null
          horario: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notificacao_enviada: boolean | null
          origem: string | null
          prioridade: Database["public"]["Enums"]["priority_type"]
          realizada_por_id: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          tipo: Database["public"]["Enums"]["task_type"] | null
          titulo: string | null
          updated_at: string
          visibilidade: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          descricao?: string | null
          endereco_completo?: string | null
          horario?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notificacao_enviada?: boolean | null
          origem?: string | null
          prioridade?: Database["public"]["Enums"]["priority_type"]
          realizada_por_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tipo?: Database["public"]["Enums"]["task_type"] | null
          titulo?: string | null
          updated_at?: string
          visibilidade?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          descricao?: string | null
          endereco_completo?: string | null
          horario?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notificacao_enviada?: boolean | null
          origem?: string | null
          prioridade?: Database["public"]["Enums"]["priority_type"]
          realizada_por_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tipo?: Database["public"]["Enums"]["task_type"] | null
          titulo?: string | null
          updated_at?: string
          visibilidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "mv_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_clicks: {
        Row: {
          contexto: string
          created_at: string | null
          extra_data: Json | null
          id: string
          referrer: string | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          contexto: string
          created_at?: string | null
          extra_data?: Json | null
          id?: string
          referrer?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          contexto?: string
          created_at?: string | null
          extra_data?: Json | null
          id?: string
          referrer?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      whatsapp_interacoes: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          id: string
          mensagem_enviada: string | null
          prospect_id: string | null
          proximos_passos: string | null
          resumo: string | null
          template_usado: string | null
          usuario_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          mensagem_enviada?: string | null
          prospect_id?: string | null
          proximos_passos?: string | null
          resumo?: string | null
          template_usado?: string | null
          usuario_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          mensagem_enviada?: string | null
          prospect_id?: string | null
          proximos_passos?: string | null
          resumo?: string | null
          template_usado?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "whatsapp_interacoes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_interacoes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects_with_last_interaction"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          id: string
          mensagem: string
          nome: string
          updated_at: string | null
          variaveis: Json | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          created_at?: string | null
          id?: string
          mensagem: string
          nome: string
          updated_at?: string | null
          variaveis?: Json | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          id?: string
          mensagem?: string
          nome?: string
          updated_at?: string | null
          variaveis?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      mv_faturamento_clientes: {
        Row: {
          cliente_id: string | null
          faturamento_total: number | null
          nome_fantasia: string | null
          total_pedidos: number | null
          ultima_compra: string | null
        }
        Relationships: []
      }
      mv_faturamento_marcas: {
        Row: {
          faturamento_total: number | null
          marca: string | null
          marca_id: string | null
          quantidade_total: number | null
          total_pedidos: number | null
        }
        Relationships: []
      }
      mv_performance_vendedores: {
        Row: {
          faturamento_total: number | null
          nome: string | null
          ticket_medio: number | null
          total_pedidos: number | null
          vendedor_id: string | null
        }
        Relationships: []
      }
      prospects_with_last_interaction: {
        Row: {
          cep: string | null
          cidade: string | null
          convertido_cliente_id: string | null
          created_at: string | null
          criado_por_id: string | null
          criado_por_nome: string | null
          data_proximo_contato: string | null
          data_ultimo_contato: string | null
          email: string | null
          endereco_completo: string | null
          estado: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          motivo_perda: string | null
          nome_empresa: string | null
          observacoes: string | null
          origem: string | null
          porte: string | null
          prioridade: string | null
          produto_utilizado: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          score: number | null
          score_atualizado_em: string | null
          segmento: string | null
          site: string | null
          status: string | null
          telefone: string | null
          ultima_interacao: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_convertido_cliente_id_fkey"
            columns: ["convertido_cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_convertido_cliente_id_fkey"
            columns: ["convertido_cliente_id"]
            isOneToOne: false
            referencedRelation: "mv_faturamento_clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "mv_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
        ]
      }
      v_analise_perda: {
        Row: {
          motivo_perda: string | null
          percentual: number | null
          total_perdas: number | null
        }
        Relationships: []
      }
      v_perda_por_vendedor: {
        Row: {
          taxa_conversao: number | null
          total_ganhos: number | null
          total_perdidos: number | null
          total_prospects: number | null
          vendedor_id: string | null
          vendedor_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "mv_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_performance_vendedores"
            referencedColumns: ["vendedor_id"]
          },
        ]
      }
      v_performance_vendedores: {
        Row: {
          faturamento_total: number | null
          prospects_convertidos: number | null
          tarefas_concluidas: number | null
          taxa_conversao: number | null
          tempo_primeira_resposta_horas: number | null
          ticket_medio: number | null
          total_pedidos: number | null
          total_prospects: number | null
          total_tarefas: number | null
          vendedor_id: string | null
          vendedor_nome: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calcular_metricas_cliente: {
        Args: { cliente_uuid: string }
        Returns: {
          compra_mensal_media: number
          total_comprado: number
        }[]
      }
      calcular_score_prospect: {
        Args: { prospect_id: string }
        Returns: number
      }
      get_cliente_produtos_historico: {
        Args: { cliente_uuid: string }
        Returns: {
          dias_desde_ultima_compra: number
          primeira_compra: string
          produto_id: string
          produto_nome: string
          status: string
          total_pedidos: number
          total_quantidade: number
          ultima_compra: string
        }[]
      }
      get_dashboard_stats_optimized: { Args: never; Returns: Json }
      get_faturamento_clientes: {
        Args: never
        Returns: {
          cliente_id: string | null
          faturamento_total: number | null
          nome_fantasia: string | null
          total_pedidos: number | null
          ultima_compra: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_faturamento_clientes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_faturamento_marcas: {
        Args: never
        Returns: {
          faturamento_total: number | null
          marca: string | null
          marca_id: string | null
          quantidade_total: number | null
          total_pedidos: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_faturamento_marcas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_loja_home_otimizada: {
        Args: { limite_produtos_por_marca?: number }
        Returns: {
          imagem_ordem: number
          imagem_url: string
          marca_ativa: boolean
          marca_created_at: string
          marca_descricao: string
          marca_id: string
          marca_imagem_banner: string
          marca_mostrar_texto_banner: boolean
          marca_nome: string
          marca_site: string
          marca_slug: string
          marca_updated_at: string
          produto_ativo: boolean
          produto_categoria: string
          produto_descricao: string
          produto_destaque_loja: boolean
          produto_id: string
          produto_nome: string
          produto_nome_loja: string
          produto_ordem_exibicao: number
          produto_peso_embalagem_kg: number
          produto_preco_por_kg: number
          produto_rank: number
          produto_rendimento_dose_gramas: number
          produto_sku: string
          produto_subcategoria: string
          produto_tipo_calculo: string
          produto_visivel_loja: boolean
        }[]
      }
      get_performance_vendedores: {
        Args: never
        Returns: {
          faturamento_total: number | null
          nome: string | null
          ticket_medio: number | null
          total_pedidos: number | null
          vendedor_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_performance_vendedores"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["user_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      pode_ver_faturamento: { Args: { user_id: string }; Returns: boolean }
      pode_ver_financeiro: { Args: { user_id: string }; Returns: boolean }
      processar_clientes_inativos: { Args: never; Returns: undefined }
      refresh_dashboard_views: { Args: never; Returns: undefined }
    }
    Enums: {
      interaction_result: "concluida" | "nao_atendido" | "reagendada"
      interaction_type: "visita" | "ligacao"
      interest_status: "comprando" | "interessado" | "parado"
      priority_type: "baixa" | "media" | "alta"
      sentiment_type: "positivo" | "neutro" | "negativo"
      task_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
      task_type: "visitar" | "ligar"
      transaction_type: "receita" | "despesa"
      user_role: "admin" | "gestor" | "colaborador" | "leitura"
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
      interaction_result: ["concluida", "nao_atendido", "reagendada"],
      interaction_type: ["visita", "ligacao"],
      interest_status: ["comprando", "interessado", "parado"],
      priority_type: ["baixa", "media", "alta"],
      sentiment_type: ["positivo", "neutro", "negativo"],
      task_status: ["pendente", "em_andamento", "concluida", "cancelada"],
      task_type: ["visitar", "ligar"],
      transaction_type: ["receita", "despesa"],
      user_role: ["admin", "gestor", "colaborador", "leitura"],
    },
  },
} as const
