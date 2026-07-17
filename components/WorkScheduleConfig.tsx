'use client';

import { useState } from 'react';
import { WorkSchedule } from '@/types';

interface WorkScheduleConfig {
  onScheduleChange: (schedule: WorkSchedule) => void;
  isLoading?: boolean;
}

const DEFAULT_SCHEDULE: WorkSchedule = {
  monday: 8,
  tuesday: 8,
  wednesday: 8,
  thursday: 8,
  friday: 8,
  saturday: 4,
};

export const WorkScheduleConfig: React.FC<WorkScheduleConfig> = ({ onScheduleChange, isLoading = false }) => {
  const [schedule, setSchedule] = useState<WorkSchedule>(DEFAULT_SCHEDULE);

  const handleChange = (day: keyof WorkSchedule, value: number) => {
    const newSchedule = { ...schedule, [day]: Math.max(0, value) };
    setSchedule(newSchedule);
    onScheduleChange(newSchedule);
  };

  const days: Array<{ key: keyof WorkSchedule; label: string }> = [
    { key: 'monday', label: 'Segunda-feira' },
    { key: 'tuesday', label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday', label: 'Quinta-feira' },
    { key: 'friday', label: 'Sexta-feira' },
    { key: 'saturday', label: 'Sábado' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuração de Jornada de Trabalho</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={schedule[key]}
                onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-600 w-8">h</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setSchedule(DEFAULT_SCHEDULE)}
        disabled={isLoading}
        className="mt-6 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Restaurar Padrão
      </button>
    </div>
  );
};
