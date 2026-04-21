// Script para debugar precisamente o problema de conflito
// Execute com: node scripts/debug-conflito-preciso.js

// Simular exatamente como o teste cria as datas
function debugConflitoPreciso() {
  console.log('=== DEBUG PRECISO DO CONFLITO ===');
  
  // Dados exatos do teste
  const existingAppointments = [
    {
      id: '1',
      startTime: new Date('2026-04-20T10:00:00'),
      endTime: new Date('2026-04-20T10:30:00'),
      service: { duration: 30, price: 35, name: 'Corte' },
      client: { name: 'João' },
      barber: { name: 'Carlos' }
    }
  ];
  
  const date = new Date('2026-04-20');
  const serviceDuration = 30;
  
  console.log('=== ANÁLISE DAS DATAS ===');
  console.log('Data base do teste:', date.toISOString());
  console.log('Data base (local):', date.toString());
  console.log('Ano:', date.getFullYear());
  console.log('Mês:', date.getMonth());
  console.log('Dia:', date.getDate());
  
  console.log('\n=== AGENDAMENTO EXISTENTE ===');
  console.log('Start Time:', existingAppointments[0].startTime.toISOString());
  console.log('Start Time (local):', existingAppointments[0].startTime.toString());
  console.log('End Time:', existingAppointments[0].endTime.toISOString());
  console.log('End Time (local):', existingAppointments[0].endTime.toString());
  
  // Simular como calculateAvailableSlots cria os slots
  console.log('\n=== CRIAÇÃO DOS SLOTS (como na função) ===');
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  console.log('Parâmetros para new Date():', year, month, day);
  
  // Criar slot das 10:00 (conflitante)
  const conflictingSlot = new Date(year, month, day, 10, 0, 0, 0);
  console.log('Slot conflitante criado:', conflictingSlot.toISOString());
  console.log('Slot conflitante (local):', conflictingSlot.toString());
  
  const endTime = new Date(conflictingSlot.getTime() + serviceDuration * 60000);
  console.log('End time do slot:', endTime.toISOString());
  console.log('End time do slot (local):', endTime.toString());
  
  // Verificar conflito
  console.log('\n=== VERIFICAÇÃO DE CONFLITO ===');
  
  const existing = existingAppointments[0];
  console.log('Comparando:');
  console.log('  Slot start:', conflictingSlot.toISOString());
  console.log('  Existing start:', existing.startTime.toISOString());
  console.log('  Slot end:', endTime.toISOString());
  console.log('  Existing end:', existing.endTime.toISOString());
  
  // Lógica exata de hasAppointmentConflict
  const startsDuringExisting = conflictingSlot >= existing.startTime && conflictingSlot < existing.endTime;
  const endsDuringExisting = endTime > existing.startTime && endTime <= existing.endTime;
  const completelyOverlaps = conflictingSlot <= existing.startTime && endTime >= existing.endTime;
  
  console.log('\n=== RESULTADO DA COMPARAÇÃO ===');
  console.log('startsDuringExisting:', startsDuringExisting);
  console.log('  Condição:', `${conflictingSlot.toISOString()} >= ${existing.startTime.toISOString()} && ${conflictingSlot.toISOString()} < ${existing.endTime.toISOString()}`);
  
  console.log('endsDuringExisting:', endsDuringExisting);
  console.log('  Condição:', `${endTime.toISOString()} > ${existing.startTime.toISOString()} && ${endTime.toISOString()} <= ${existing.endTime.toISOString()}`);
  
  console.log('completelyOverlaps:', completelyOverlaps);
  console.log('  Condição:', `${conflictingSlot.toISOString()} <= ${existing.startTime.toISOString()} && ${endTime.toISOString()} >= ${existing.endTime.toISOString()}`);
  
  const hasConflict = startsDuringExisting || endsDuringExisting || completelyOverlaps;
  console.log('\n=== RESULTADO FINAL ===');
  console.log('Tem conflito?', hasConflict);
  console.log('isAvailable (deveria ser !hasConflict):', !hasConflict);
  
  if (!hasConflict) {
    console.log('\n=== PROBLEMA IDENTIFICADO ===');
    console.log('O slot conflitante NÃO está sendo detectado como conflito!');
    console.log('Possíveis causas:');
    console.log('1. Timezone: As datas estão em fusos diferentes');
    console.log('2. Formato: As datas estão sendo interpretadas de forma diferente');
    console.log('3. Lógica: A condição de comparação está incorreta');
    
    // Verificar timezone
    console.log('\n=== VERIFICAÇÃO DE TIMEZONE ===');
    console.log('Slot start timezone offset (minutos):', conflictingSlot.getTimezoneOffset());
    console.log('Existing start timezone offset (minutos):', existing.startTime.getTimezoneOffset());
    console.log('São iguais?', conflictingSlot.getTimezoneOffset() === existing.startTime.getTimezoneOffset());
    
    // Verificar timestamps
    console.log('\n=== VERIFICAÇÃO DE TIMESTAMPS ===');
    console.log('Slot start timestamp:', conflictingSlot.getTime());
    console.log('Existing start timestamp:', existing.startTime.getTime());
    console.log('Diferença (ms):', conflictingSlot.getTime() - existing.startTime.getTime());
  }
}

debugConflitoPreciso();
