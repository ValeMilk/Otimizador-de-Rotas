/**
 * Calcula a distância em quilômetros usando a Fórmula de Haversine
 * entre dois pontos de coordenadas (latitude, longitude)
 */
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Estima o tempo de deslocamento em minutos baseado na distância
 * Assume uma velocidade média de 40 km/h para cidades
 */
export const estimateTravelTime = (distanceKm: number): number => {
  const speedKmPerHour = 40; // velocidade média em km/h
  return (distanceKm / speedKmPerHour) * 60; // retorna em minutos
};

/**
 * Calcula a matriz de distâncias entre todos os pontos
 */
export const calculateDistanceMatrix = (
  clients: Array<{ id: string; latitude: number; longitude: number }>
): Map<string, Map<string, number>> => {
  const matrix = new Map<string, Map<string, number>>();

  for (let i = 0; i < clients.length; i++) {
    const from = clients[i];
    matrix.set(from.id, new Map());

    for (let j = 0; j < clients.length; j++) {
      const to = clients[j];
      const distance =
        i === j ? 0 : calculateHaversineDistance(from.latitude, from.longitude, to.latitude, to.longitude);
      matrix.get(from.id)!.set(to.id, distance);
    }
  }

  return matrix;
};

/**
 * Implementa o algoritmo do Vizinho Mais Próximo (Nearest Neighbor)
 * para ordenar os pontos de forma a minimizar o percurso total
 * 
 * IMPORTANTE: Suporta múltiplas visitas do mesmo cliente (IDs duplicados)
 * usando índices em vez de IDs únicos
 */
export const nearestNeighbor = (
  clientIds: string[],
  distanceMatrix: Map<string, Map<string, number>>
): string[] => {
  if (clientIds.length === 0) return [];
  if (clientIds.length === 1) return clientIds;

  const visitedIndices = new Set<number>();
  const route: string[] = [];

  // Começa com o primeiro cliente
  let currentIdx = 0;
  route.push(clientIds[currentIdx]);
  visitedIndices.add(currentIdx);
  let currentClientId = clientIds[currentIdx];

  // Enquanto houver clientes não visitados
  while (visitedIndices.size < clientIds.length) {
    let nearestIdx = -1;
    let minDistance = Infinity;

    // Encontra o cliente não visitado mais próximo
    for (let i = 0; i < clientIds.length; i++) {
      if (!visitedIndices.has(i)) {
        const candidateClientId = clientIds[i];
        const distance = distanceMatrix.get(currentClientId)?.get(candidateClientId) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          nearestIdx = i;
        }
      }
    }

    // Se não encontrou vizinho (erro na matriz), adiciona qualquer cliente não visitado
    if (nearestIdx === -1) {
      for (let i = 0; i < clientIds.length; i++) {
        if (!visitedIndices.has(i)) {
          nearestIdx = i;
          break;
        }
      }
    }

    if (nearestIdx !== -1) {
      route.push(clientIds[nearestIdx]);
      visitedIndices.add(nearestIdx);
      currentClientId = clientIds[nearestIdx];
    } else {
      // Segurança: se ainda não encontrou, quebra o loop
      console.error('[Engine ERROR] nearestNeighbor: Não conseguiu encontrar próximo cliente não visitado');
      break;
    }
  }

  return route;
};
