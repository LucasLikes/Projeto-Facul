import type { Arena, Court } from "@/lib/domain";
import { addLocalDays, saoPauloDateString } from "@/lib/time";

export const demoArena: Arena = {
  id: "10000000-0000-4000-8000-000000000001",
  nome: "Arena Teste",
  slug: "arena-teste",
  cidade: "São Paulo, SP",
  telefone_whatsapp: "5511999999999",
  logo_url: null,
  cor_primaria: "#c5f36b",
  retention_days: 30,
  publicidade_ativa: false,
  publicidade_titulo: null,
  publicidade_texto: null,
  publicidade_imagem_url: null,
  publicidade_whatsapp: "5511999999999",
};

export const demoCourts: Court[] = [
  { id: "20000000-0000-4000-8000-000000000001", arena_id: demoArena.id, nome: "Society 1", esporte: "futebol_society", tipo: "externa", slug: "society-1", ativa: true },
  { id: "20000000-0000-4000-8000-000000000002", arena_id: demoArena.id, nome: "Society 2", esporte: "futebol_society", tipo: "externa", slug: "society-2", ativa: true },
  { id: "20000000-0000-4000-8000-000000000003", arena_id: demoArena.id, nome: "Vôlei Externo 1", esporte: "volei", tipo: "externa", slug: "volei-externo-1", ativa: true },
  { id: "20000000-0000-4000-8000-000000000004", arena_id: demoArena.id, nome: "Vôlei Externo 2", esporte: "volei", tipo: "externa", slug: "volei-externo-2", ativa: true },
];

const demoCapturePlan = [
  [0, 17, 12], [0, 17, 48], [0, 18, 21], [0, 18, 54], [0, 19, 7],
  [0, 19, 42], [0, 20, 15], [0, 21, 11], [0, 21, 53], [0, 22, 28],
  [1, 17, 25], [1, 18, 14], [1, 18, 47], [1, 19, 36], [1, 20, 3],
  [1, 20, 51], [1, 21, 32], [2, 17, 41], [2, 19, 19], [2, 22, 6],
] as const;

const demoReplayIds = [
  "d4414533-a127-40dd-991a-aa5d3e511ad5", "73c80f61-0a52-41a9-86ed-55196d4c471d",
  "1537b1b7-1227-4a3f-9fde-94b9d908c9de", "a1ed4532-46a7-4cb8-b494-fbfd4fd37644",
  "d252b602-4288-4f25-ae0d-6f09e967f8b7", "d23ffade-4660-4f4a-b490-ef7dc492e84c",
  "8e0a10c0-bc3b-4457-90f6-832d650bdeb9", "780b3d6c-3b13-4cf4-bb64-3b1201173513",
  "1045d012-622e-4df6-85e9-f77c261843ae", "a921e6f0-fdf4-49dc-97c6-f4b7cd6553be",
  "083a1f53-4ef1-4172-8edf-af00fbdaaa6f", "afa5c3e7-c1c9-4ad6-9960-3640d5627bd7",
  "7e0d5f75-e5e5-4bd6-951f-c5724db951b7", "35db13d8-1eb7-4ba7-a6b1-adfd7e04f812",
  "ce9a0ee3-c804-43ad-81a4-5c6b1973bc86", "508729e9-09f9-4a8f-9fd0-a0b8b60b95a2",
  "e668d939-aeeb-4128-8e84-980717810062", "c0734922-47bc-460b-8021-6063954d1637",
  "1b4ba79c-10b6-4f9f-bade-3306510958e4", "4bc8a72a-6f13-4853-9921-6981ff3b1b06",
];

export function getDemoReplays(courtId: string, date: string) {
  return demoCapturePlan.flatMap(([daysAgo, hour, minute], index) => {
    if (demoCourts[index % demoCourts.length].id !== courtId || addLocalDays(saoPauloDateString(), -daysAgo) !== date) return [];
    const capture = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`);
    return [{
      id: demoReplayIds[index],
      capturado_em: capture.toISOString(),
      duracao_s: 35,
      thumb_url: "/thumb-placeholder.svg",
      video_url: null,
      demo: true,
    }];
  });
}