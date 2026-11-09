import { useChartStore } from '@/lib/store/useChartStore';
import { ChartData, ToothClinicalData, FDIToothNumber, SurfaceId, ALL_TEETH } from '@/lib/types';

export function useChartData() {
  const { chartData, collectDataAsJson, updateField, calculateAL } = useChartStore();

  const getToothData = (tooth: FDIToothNumber): ToothClinicalData => {
    const surfaces: SurfaceId[] = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'];
    const toothData: Partial<ToothClinicalData> = {};

    surfaces.forEach(surface => {
      toothData[`bop_${surface}`] = chartData[`bop_${tooth}_${surface}`];
      toothData[`pi_${surface}`] = chartData[`pi_${tooth}_${surface}`];
      toothData[`gm_${surface}`] = chartData[`gm_${tooth}_${surface}`];
      toothData[`pd_${surface}`] = chartData[`pd_${tooth}_${surface}`];
      toothData[`al_${surface}`] = chartData[`al_${tooth}_${surface}`];
      toothData[`muc_${surface}`] = chartData[`muc_${tooth}_${surface}`];
    });

    toothData.tooth = chartData[`tooth_${tooth}`];
    toothData.mobility = chartData[`mobility_${tooth}`];
    toothData.furcation_b = chartData[`furcation_${tooth}_b`];
    toothData.furcation_dp = chartData[`furcation_${tooth}_dp`];
    toothData.furcation_mp = chartData[`furcation_${tooth}_mp`];
    toothData.furcation_l = chartData[`furcation_${tooth}_l`];
    toothData.furcation_p = chartData[`furcation_${tooth}_p`];
    toothData.implant = chartData[`implant_${tooth}`];
    toothData.note = chartData[`note_${tooth}`];
    toothData.rec_y = chartData[`rec_y_${tooth}`];
    toothData.rec_x = chartData[`rec_x_${tooth}`];
    toothData.recMiller = chartData[`recMiller_${tooth}`];
    toothData.recCairo = chartData[`recCairo_${tooth}`];
    toothData.pt = chartData[`pt_${tooth}`];
    toothData.width = chartData[`width_${tooth}`];
    toothData.cej = chartData[`cej_${tooth}`];
    toothData.wsd = chartData[`wsd_${tooth}`];
    toothData.gi_sci = chartData[`gi_sci_${tooth}`];
    toothData.mgi_sci = chartData[`mgi_sci_${tooth}`];
    toothData.pi_sci = chartData[`pi_sci_${tooth}`];
    toothData.mpi_sci = chartData[`mpi_sci_${tooth}`];

    return toothData as ToothClinicalData;
  };

  const updateSurface = (tooth: FDIToothNumber, surface: SurfaceId, prefix: string, value: number | string) => {
    updateField(`${prefix}_${tooth}_${surface}`, value);
  };

  const toggleIndex = (tooth: FDIToothNumber, surface: SurfaceId, type: 'bop' | 'pi') => {
    const key = `${type}_${tooth}_${surface}`;
    const current = chartData[key] === '1' || chartData[key] === 1;
    updateField(key, current ? '0' : '1');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('svg-render', { detail: { tooth, type } }));
    }
  };

  const toggleTooth = (tooth: FDIToothNumber) => {
    const current = chartData[`tooth_${tooth}`] === '1';
    updateField(`tooth_${tooth}`, current ? '0' : '1');

    if (current) {
      clearToothData(tooth);
    }
  };

  const cycleImplant = (tooth: FDIToothNumber) => {
    const current = (chartData[`implant_${tooth}`] as number) || 0;
    const next = (current + 1) % 4;
    updateField(`implant_${tooth}`, next.toString());
  };

  const updateFurcation = (tooth: FDIToothNumber, site: string, grade: 0 | 1 | 2 | 3) => {
    updateField(`furcation_${tooth}_${site}`, grade.toString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('svg-render', { detail: { tooth } }));
    }
  };

  const updateMobility = (tooth: FDIToothNumber, grade: 0 | 1 | 2 | 3) => {
    updateField(`mobility_${tooth}`, grade.toString());
  };

  const updateNote = (tooth: FDIToothNumber, note: string) => {
    updateField(`note_${tooth}`, note);
  };

  const clearToothData = (tooth: FDIToothNumber) => {
    const surfaces: SurfaceId[] = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'];
    surfaces.forEach(surface => {
      updateField(`pd_${tooth}_${surface}`, 0);
      updateField(`gm_${tooth}_${surface}`, 0);
      updateField(`bop_${tooth}_${surface}`, 0);
      updateField(`pi_${tooth}_${surface}`, 0);
      updateField(`muc_${tooth}_${surface}`, 0);
      updateField(`al_${tooth}_${surface}`, 0);
    });
    updateField(`mobility_${tooth}`, 0);
    updateField(`implant_${tooth}`, 0);
    updateField(`furcation_${tooth}_b`, 0);
    updateField(`furcation_${tooth}_dp`, 0);
    updateField(`furcation_${tooth}_mp`, 0);
    updateField(`furcation_${tooth}_l`, 0);
    updateField(`furcation_${tooth}_p`, 0);
    updateField(`note_${tooth}`, '');
  };

  return {
    chartData,
    collectDataAsJson,
    updateField,
    getToothData,
    updateSurface,
    toggleIndex,
    toggleTooth,
    cycleImplant,
    updateFurcation,
    updateMobility,
    updateNote,
    calculateAL,
  };
}