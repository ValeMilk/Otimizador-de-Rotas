/**
 * Teste da função distributeNonConsecutiveDays (CORRIGIDA)
 * Replica a lógica para testar sem depender de build/servidor
 */

const distributeNonConsecutiveDays = (
  frequency,
  availableDays
) => {
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  console.log(`\n🔍 distributeNonConsecutiveDays(freq=${frequency}, dias=${availableDays.join(',')})`);
  
  if (frequency <= 0 || availableDays.length === 0) {
    console.log('   → Entrada inválida');
    return [];
  }
  if (frequency === 1) {
    console.log(`   → Freq=1: retorna [${availableDays[0]}]`);
    return [availableDays[0]];
  }
  if (availableDays.length === 1) {
    console.log(`   → Apenas 1 dia disponível: retorna [${availableDays[0]}]`);
    return [...availableDays];
  }
  
  const selectedDays = [];
  let targetDays = Math.min(frequency, availableDays.length);
  let iteration = 0;
  
  while (selectedDays.length === 0 && targetDays > 0) {
    iteration++;
    console.log(`   Iteração ${iteration}: targetDays=${targetDays}`);
    
    const minGapSize = Math.ceil(availableDays.length / targetDays);
    console.log(`     minGapSize = ceil(${availableDays.length} / ${targetDays}) = ${minGapSize}`);
    
    let lastIndex = -minGapSize;
    for (let i = 0; i < availableDays.length && selectedDays.length < targetDays; i++) {
      if (i - lastIndex >= minGapSize) {
        selectedDays.push(availableDays[i]);
        lastIndex = i;
        console.log(`     Selecionado índice ${i} (${availableDays[i]}), lastIndex=${i}`);
      }
    }
    
    console.log(`     Após loop: selectedDays.length=${selectedDays.length}, targetDays=${targetDays}`);
    
    if (selectedDays.length === targetDays) {
      let hasConsecutive = false;
      for (let i = 0; i < selectedDays.length - 1; i++) {
        const weekIdx1 = dayOrder.indexOf(selectedDays[i]);
        const weekIdx2 = dayOrder.indexOf(selectedDays[i + 1]);
        const diff = Math.abs(weekIdx1 - weekIdx2);
        console.log(`     Verificando: ${selectedDays[i]} (semana idx=${weekIdx1}) vs ${selectedDays[i + 1]} (semana idx=${weekIdx2}), diff=${diff}`);
        if (diff === 1) {
          hasConsecutive = true;
          console.log(`     ⚠️ Consecutivos detectados na SEMANA!`);
          break;
        }
      }
      
      if (hasConsecutive) {
        console.log(`     → Tem consecutivos, reduz targetDays`);
        selectedDays.length = 0;
        targetDays--;
      } else {
        console.log(`     ✓ Sem consecutivos na semana, aceita resultado`);
      }
    } else if (selectedDays.length < targetDays) {
      console.log(`     → Não conseguiu ${targetDays} dias, reduz targetDays`);
      selectedDays.length = 0;
      targetDays--;
    }
    
    if (iteration > 20) {
      console.log('     ❌ LOOP INFINITO DETECTADO!');
      break;
    }
  }
  
  if (selectedDays.length === 0) {
    console.log(`   → Nenhum resultado, usa primeiro dia: [${availableDays[0]}]`);
    selectedDays.push(availableDays[0]);
  }
  
  const result = selectedDays.sort((a, b) => {
    return dayOrder.indexOf(a) - dayOrder.indexOf(b);
  });
  
  console.log(`   ✅ Resultado: [${result.join(',')}]`);
  return result;
};

// ========== TESTES ==========
console.log('=' .repeat(60));
console.log('TESTE CORRIGIDO: Distribuição de Dias Não-Consecutivos');
console.log('=' .repeat(60));

// Teste 1: Freq=2, 2 dias consecutivos → reduzir para 1
console.log('\n📌 TESTE 1: Freq=2, Dias=[SEG, TER] (consecutivos na semana)');
distributeNonConsecutiveDays(2, ['monday', 'tuesday']);

// Teste 2: Freq=2, 2 dias espaçados → manter ambos!
console.log('\n📌 TESTE 2: Freq=2, Dias=[SEG, QUA] (ESPAÇADOS na semana - deve manter)');
distributeNonConsecutiveDays(2, ['monday', 'wednesday']);

// Teste 3: Freq=3, 3 dias múltiplos
console.log('\n📌 TESTE 3: Freq=3, Dias=[SEG, TER, QUA] (consecutivos)');
distributeNonConsecutiveDays(3, ['monday', 'tuesday', 'wednesday']);

// Teste 4: Freq=3, dias espaçados
console.log('\n📌 TESTE 4: Freq=3, Dias=[SEG, QUA, SEX] (espaçados na semana - deve manter)');
distributeNonConsecutiveDays(3, ['monday', 'wednesday', 'friday']);

// Teste 5: Freq=4, todos os dias úteis
console.log('\n📌 TESTE 5: Freq=4, Dias=[SEG-SAB] (6 dias, seleciona 4 não-consecutivos)');
distributeNonConsecutiveDays(4, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']);

// Teste 6: Freq=1, um dia
console.log('\n📌 TESTE 6: Freq=1, Dias=[TER]');
distributeNonConsecutiveDays(1, ['tuesday']);

console.log('\n' + '=' .repeat(60));
console.log('✅ Todos os testes concluídos!');
console.log('=' .repeat(60));

