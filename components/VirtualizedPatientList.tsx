'use client';

import React, { useCallback, useMemo } from 'react';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Calendar, User } from 'lucide-react';

interface Patient {
  paciente_id: string;
  nombre_completo: string;
  telefono?: string;
  email?: string;
  ultima_visita?: string;
  proxima_cita?: string;
  estado: 'activo' | 'inactivo' | 'pendiente';
}

interface VirtualizedPatientListProps {
  patients: Patient[];
  onPatientSelect: (patient: Patient) => void;
  onPatientEdit?: (patient: Patient) => void;
  onPatientDelete?: (patient: Patient) => void;
  loading?: boolean;
  height?: number;
  itemHeight?: number;
}

const PatientRow = React.memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: {
    patients: Patient[];
    onPatientSelect: (patient: Patient) => void;
    onPatientEdit?: (patient: Patient) => void;
    onPatientDelete?: (patient: Patient) => void;
  };
}) => {
  const patient = data.patients[index];
  const { onPatientSelect, onPatientEdit, onPatientDelete } = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo': return 'bg-green-100 text-green-800';
      case 'inactivo': return 'bg-red-100 text-red-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div style={style} className="px-2 py-1">
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div 
            className="flex-1 min-w-0"
            onClick={() => onPatientSelect(patient)}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <User className="h-10 w-10 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {patient.nombre_completo}
                </h3>
                <div className="flex items-center gap-4 mt-1">
                  {patient.telefono && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="h-3 w-3" />
                      {patient.telefono}
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{patient.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <Badge className={getStatusColor(patient.estado)}>
                    {patient.estado}
                  </Badge>
                  {patient.proxima_cita && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Calendar className="h-3 w-3" />
                      {new Date(patient.proxima_cita).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {onPatientEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onPatientEdit(patient);
                }}
              >
                Editar
              </Button>
            )}
            {onPatientDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onPatientDelete(patient);
                }}
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
});

PatientRow.displayName = 'PatientRow';

export const VirtualizedPatientList: React.FC<VirtualizedPatientListProps> = ({
  patients,
  onPatientSelect,
  onPatientEdit,
  onPatientDelete,
  loading = false,
  height = 600,
  itemHeight = 120
}) => {
  const data = useMemo(() => ({
    patients,
    onPatientSelect,
    onPatientEdit,
    onPatientDelete
  }), [patients, onPatientSelect, onPatientEdit, onPatientDelete]);

  const renderItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <PatientRow
      index={index}
      style={style}
      data={data}
    />
  ), [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <User className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No hay pacientes</p>
        <p className="text-sm">No se encontraron pacientes en la lista</p>
      </div>
    );
  }

  return (
    <div className="w-full border rounded-lg">
      <AutoSizer>
        {({ width, height }: { width: number; height: number }) => (
          <List
            height={Math.min(height, 600)}
            width={width}
            itemCount={patients.length}
            itemSize={itemHeight}
            itemData={data}
          >
            {renderItem}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

export default VirtualizedPatientList;
