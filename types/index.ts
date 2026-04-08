export type Clinic = {
  id: string
  name: string
  phone: string
  email: string
  address: string
  vapi_assistant_id: string | null
  twilio_phone_number: string | null
  created_at: string
}

export type Patient = {
  id: string
  clinic_id: string
  full_name: string
  phone: string
  email: string | null
  date_of_birth: string | null
  notes: string | null
  gdpr_consent: boolean
  created_at: string
  updated_at: string
}

export type Appointment = {
  id: string
  clinic_id: string
  patient_id: string
  treatment: string
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  notes: string | null
  created_at: string
  updated_at: string
  patient?: Patient
}

export type CallLog = {
  id: string
  clinic_id: string
  patient_id: string | null
  vapi_call_id: string
  direction: 'inbound' | 'outbound'
  from_number: string
  to_number: string
  duration_seconds: number | null
  transcript: string | null
  summary: string | null
  status: 'in_progress' | 'completed' | 'failed'
  started_at: string
  ended_at: string | null
  patient?: Patient
}

export type SmsLog = {
  id: string
  clinic_id: string
  patient_id: string | null
  twilio_sid: string
  direction: 'inbound' | 'outbound'
  from_number: string
  to_number: string
  body: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received'
  sent_at: string
  patient?: Patient
}

export type Database = {
  public: {
    Tables: {
      clinics: { Row: Clinic; Insert: Omit<Clinic, 'id' | 'created_at'>; Update: Partial<Omit<Clinic, 'id' | 'created_at'>> }
      patients: { Row: Patient; Insert: Omit<Patient, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Patient, 'id' | 'created_at'>> }
      appointments: { Row: Appointment; Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Appointment, 'id' | 'created_at'>> }
      call_logs: { Row: CallLog; Insert: Omit<CallLog, 'id'>; Update: Partial<Omit<CallLog, 'id'>> }
      sms_logs: { Row: SmsLog; Insert: Omit<SmsLog, 'id'>; Update: Partial<Omit<SmsLog, 'id'>> }
    }
  }
}
