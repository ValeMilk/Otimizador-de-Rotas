/**
 * Converte uma string de formato HH:MM:SS para minutos
 */
export const timeStringToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours = 0, minutes = 0, seconds = 0] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + Math.round(seconds / 60);
};

/**
 * Converte minutos para formato HH:MM:SS
 */
export const minutesToTimeString = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const seconds = Math.round((totalMinutes % 1) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Adiciona minutos a uma hora (formato HH:MM:SS)
 */
export const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const totalMinutes = timeStringToMinutes(timeStr) + minutesToAdd;
  return minutesToTimeString(totalMinutes);
};

/**
 * Converte horas (número decimal) para minutos
 */
export const hoursToMinutes = (hours: number): number => {
  return Math.round(hours * 60);
};

/**
 * Converte minutos para horas (número decimal)
 */
export const minutesToHours = (minutes: number): number => {
  return Math.round((minutes / 60) * 100) / 100;
};

/**
 * Formata minutos em um formato legível HH:MM
 */
export const formatMinutesForDisplay = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
};

/**
 * Retorna o nome do dia da semana em português
 */
export const getDayName = (dayKey: string): string => {
  const dayMap: { [key: string]: string } = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
  };
  return dayMap[dayKey] || dayKey;
};

/**
 * Retorna a chave abreviada do dia
 */
export const getDayKey = (index: number): string => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[index] || 'monday';
};
