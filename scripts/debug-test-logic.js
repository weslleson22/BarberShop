// Script para debugar a lógica dos testes falhando
// Execute com: node scripts/debug-test-logic.js

// Simular a lógica das funções para identificar o problema

function hasAppointmentConflict(newStartTime, newEndTime, existingAppointments) {
  console.log('=== DEBUG hasAppointmentConflict ===');
  console.log('Novo agendamento:', newStartTime.toISOString(), '-', newEndTime.toISOString());
  
  return existingAppointments.some(existing => {
    console.log('Verificando contra existente:', existing.startTime.toISOString(), '-', existing.endTime.toISOString());
    
    // Verificar sobreposição de horários
    const startsDuringExisting = newStartTime >= existing.startTime && newStartTime < existing.endTime;
    const endsDuringExisting = newEndTime > existing.startTime && newEndTime <= existing.endTime;
    const completelyOverlaps = newStartTime <= existing.startTime && newEndTime >= existing.endTime;
    
    console.log('  startsDuringExisting:', startsDuringExisting);
    console.log('  endsDuringExisting:', endsDuringExisting);
    console.log('  completelyOverlaps:', completelyOverlaps);
    
    const hasConflict = startsDuringExisting || endsDuringExisting || completelyOverlaps;
    console.log('  -> Conflito:', hasConflict);
    
    return hasConflict;
  });
}

function calculateAvailableSlots(date, serviceDuration, existingAppointments, workingHours = { start: 8, end: 18 }) {
  console.log('=== DEBUG calculateAvailableSlots ===');
  console.log('Data:', date.toISOString());
  console.log('Duração do serviço:', serviceDuration);
  console.log('Agendamentos existentes:', existingAppointments.length);
  
  const slots = [];
  const currentDate = new Date(date);
  currentDate.setHours(0, 0, 0, 0);
  
  // Gerar slots de 30 minutos durante o horário de trabalho
  for (let hour = workingHours.start; hour < workingHours.end; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const startTime = new Date(currentDate);
      startTime.setHours(hour, minute, 0, 0);
      
      const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
      
      // Verificar se o slot está dentro do horário de trabalho
      if (endTime.getHours() > workingHours.end || 
          (endTime.getHours() === workingHours.end && endTime.getMinutes() > 0)) {
        console.log(`Slot ${hour}:${minute.toString().padStart(2, '0')} - Fora do horário de trabalho (termina ${endTime.getHours()}:${endTime.getMinutes()})`);
        continue;
      }
      
      // Verificar se há conflito com agendamentos existentes
      const isAvailable = !hasAppointmentConflict(startTime, endTime, existingAppointments);
      
      console.log(`Slot ${hour}:${minute.toString().padStart(2, '0')} - ${isAvailable ? 'DISPONÍVEL' : 'INDISPONÍVEL'}`);
      
      slots.push({
        startTime,
        endTime,
        isAvailable
      });
    }
  }
  
  return slots;
}

function validateAppointmentTime(startTime, serviceDuration, workingHours = { start: 8, end: 18 }) {
  console.log('=== DEBUG validateAppointmentTime ===');
  console.log('Horário inicial:', startTime.toISOString());
  console.log('Duração do serviço:', serviceDuration);
  console.log('Horário de funcionamento:', workingHours);
  
  const now = new Date();
  const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
  
  console.log('Horário final:', endTime.toISOString());
  console.log('Agora:', now.toISOString());
  
  // Não permitir agendamentos no passado
  if (startTime < now) {
    console.log('-> REJEITADO: Agendamento no passado');
    return { isValid: false, error: 'Não é possível agendar no passado' };
  }
  
  // Verificar se está dentro do horário de trabalho
  if (startTime.getHours() < workingHours.start || startTime.getHours() >= workingHours.end) {
    console.log('-> REJEITADO: Fora do horário de funcionamento (início)');
    console.log('  startTime.getHours():', startTime.getHours());
    console.log('  workingHours.start:', workingHours.start);
    console.log('  workingHours.end:', workingHours.end);
    return { isValid: false, error: 'Fora do horário de funcionamento' };
  }
  
  console.log('Verificando se ultrapassa horário de funcionamento:');
  console.log('  endTime.getHours():', endTime.getHours());
  console.log('  endTime.getMinutes():', endTime.getMinutes());
  console.log('  workingHours.end:', workingHours.end);
  
  if (endTime.getHours() > workingHours.end || 
      (endTime.getHours() === workingHours.end && endTime.getMinutes() > 0)) {
    console.log('-> REJEITADO: Serviço ultrapassa o horário de funcionamento');
    return { isValid: false, error: 'Serviço ultrapassa o horário de funcionamento' };
  }
  
  console.log('-> APROVADO');
  return { isValid: true };
}

// Testar os casos específicos que estão falhando

console.log('=== TESTE 1: calculateAvailableSlots - Conflito ===');
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
const slots = calculateAvailableSlots(date, 30, existingAppointments);

// Procurar slot que começa exatamente às 10:00
const conflictingSlot = slots.find(slot => 
  slot.startTime.getHours() === 10 && slot.startTime.getMinutes() === 0
);

console.log('\n=== RESULTADO TESTE 1 ===');
console.log('Slot conflitante encontrado:', conflictingSlot ? 'SIM' : 'NÃO');
if (conflictingSlot) {
  console.log('Slot conflitante disponível:', conflictingSlot.isAvailable);
  console.log('Era esperado: false (indisponível)');
  console.log('Teste ' + (conflictingSlot.isAvailable ? 'FALHOU' : 'PASSOU'));
}

console.log('\n=== TESTE 2: validateAppointmentTime - Ultrapassa horário ===');
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(16, 30, 0, 0); // 16:30

console.log('Testando serviço das 16:30 com 90 minutos de duração');
const result = validateAppointmentTime(tomorrow, 90, { start: 8, end: 18 });

console.log('\n=== RESULTADO TESTE 2 ===');
console.log('Resultado isValid:', result.isValid);
console.log('Era esperado: false (inválido)');
console.log('Erro:', result.error);
console.log('Teste ' + (result.isValid ? 'FALHOU' : 'PASSOU'));

console.log('\n=== ANÁLISE DOS PROBLEMAS ===');
console.log('1. Se o slot conflitante está disponível, a função hasAppointmentConflict não está detectando o conflito corretamente');
console.log('2. Se o serviço ultrapassa horário está válido, a validação está permitindo quando não deveria');
