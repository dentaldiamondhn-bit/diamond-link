export interface Quote {
  id: string;
  patient_id: string;
  patient_name: string;
  treatment_description: string;
  total_amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  notes?: string;
  doctor_name: string;
  items: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
