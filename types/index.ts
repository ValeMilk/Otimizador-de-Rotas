export interface Client {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  visitDurationMinutes: number;
  frequency: number;
  visitorDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  };
  promoterBlockedDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  };
  promoterId: string;
}

export interface WorkSchedule {
  monday: number; // hours
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
}

export interface RouteStop {
  order: number;
  clientId: string;
  clientName: string;
  latitude: number;
  longitude: number;
  visitDurationMinutes: number;
  travelTimeMinutes: number;
  travelDistanceKm?: number; // distância até este cliente em km
  arrivalTime: string;
  departureTime: string;
  frequency?: number; // frequência original
  visitorDays?: Client['visitorDays']; // dias originais do cliente
}

export interface Promoter {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface DailySchedule {
  limit: number; // capacidade em minutos (480 seg-sex, 240 sábado)
  timeUsed: number; // tempo já alocado
  stops: RouteStop[]; // visitas agendadas para este dia
}

export interface PromotorRota {
  id: number; // Ex: 1, 2, 3...
  nome: string; // Ex: "ROTA 1"
  promoterId: string;
  agenda: {
    "Segunda-feira": DailySchedule;
    "Terça-feira": DailySchedule;
    "Quarta-feira": DailySchedule;
    "Quinta-feira": DailySchedule;
    "Sexta-feira": DailySchedule;
    "Sábado": DailySchedule;
  };
}

// Compatibilidade com exportação - view de uma rota por dia
export interface DailyRoute {
  day?: string; // 'Segunda-feira', 'Terça-feira', etc.
  promoterId: string;
  routeNumber?: number; // número global da rota (ex: 1)
  stops: RouteStop[];
  totalTravelTimeMinutes: number;
  totalVisitTimeMinutes: number;
  totalTimeMinutes: number;
  totalTravelDistanceKm?: number; // distância total em km da rota
}

export interface OptimizationResult {
  rotas: PromotorRota[]; // rotas por promotor (estrutura correta)
  routes: DailyRoute[]; // compatibilidade com export (vista por dia)
  clients: Client[]; // incluir clientes para referência na exportação
  promoters: Promoter[]; // promotores configurados
  routeAssignments: { [routeNumber: number]: string }; // routeNumber -> promoterId
  summary: {
    totalPromotores: number;
    totalClientsAssigned: number;
    averageUtilization: number;
    warnings: string[];
  };
}
