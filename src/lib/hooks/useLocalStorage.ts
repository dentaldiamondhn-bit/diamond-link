const STORAGE_KEY = 'parodontalstatus_data';
const BACKUP_KEY = 'parodontalstatus_backup';

export interface StorageData {
  patients: any[];
  settings: any;
  version: number;
}

const CURRENT_VERSION = 2;

export function loadFromStorage(): StorageData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return migrateData(data);
    }
  } catch (e) {
    console.error('Failed to load from localStorage', e);
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) return JSON.parse(backup);
    } catch {
      return null;
    }
  }
  return null;
}

export function saveToStorage(data: StorageData): boolean {
  try {
    const json = JSON.stringify({ ...data, version: CURRENT_VERSION });
    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(BACKUP_KEY, json);
    return true;
  } catch (e) {
    if (isQuotaExceeded(e)) {
      showStorageFullDialog();
    }
    return false;
  }
}

function isQuotaExceeded(e: unknown): boolean {
  if (e instanceof DOMException) {
    return e.name === 'QuotaExceededError' || e.code === 22;
  }
  return false;
}

function migrateData(data: any): StorageData {
  if (!data.version || data.version < 2) {
    data.patients?.forEach((patient: any) => {
      patient.charts?.forEach((chart: any) => {
        if (chart.input_reevaluation && !chart.reevaluation_note) {
          chart.reevaluation_note = chart.input_reevaluation;
          delete chart.input_reevaluation;
        }
        if (chart.json_data) {
          let jsonData: any = null;
          try {
            jsonData = JSON.parse(chart.json_data);
          } catch {
            jsonData = null;
          }
          if (jsonData?.input_reevaluation && !jsonData.reevaluation_note) {
            jsonData.reevaluation_note = jsonData.input_reevaluation;
            delete jsonData.input_reevaluation;
            chart.json_data = JSON.stringify(jsonData);
          }
        }
      });
    });
  }
  return { ...data, version: CURRENT_VERSION };
}

function showStorageFullDialog() {
  if (typeof window !== 'undefined') {
    alert('Browser storage is full. Please export your data and delete old records.');
  }
}