export type Arena = {
  id: string;
  nome: string;
  slug: string;
  cidade: string;
  telefone_whatsapp: string;
  logo_url: string | null;
  cor_primaria: string;
  retention_days: number;
  publicidade_ativa: boolean;
  publicidade_titulo: string | null;
  publicidade_texto: string | null;
  publicidade_imagem_url: string | null;
  publicidade_whatsapp: string;
};

export type Court = {
  id: string;
  arena_id: string;
  nome: string;
  esporte: string;
  tipo: "interna" | "externa";
  slug: string;
  ativa: boolean;
};

export type ReplayView = {
  id: string;
  capturado_em: string;
  duracao_s: number;
  thumb_url: string;
  video_url: string | null;
  demo: boolean;
};

export type ReplayComment = {
  id: string;
  replay_id: string;
  apelido: string;
  texto: string;
  criado_em: string;
  demo?: boolean;
};

export type CourtSlot = {
  id: string;
  hora_inicio: string;
  hora_fim: string;
  reservado: boolean;
  status: "livre" | "reservado" | "agora";
  replays: ReplayView[];
};

export type CourtDay = {
  arena: Arena;
  court: Court;
  courts: Court[];
  date: string;
  slots: CourtSlot[];
  hasConfiguredSlots: boolean;
};

export type BookingView = {
  id: string;
  court_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: "pendente" | "confirmada" | "cancelada" | "bloqueada";
};

export type BookingDay = {
  date: string;
  slots: { hora_inicio: string; hora_fim: string; livre: boolean }[];
};