export interface ContactFormData {
  name: string;
  email: string;
  message: string;
  honeypot?: string; // hidden field — if filled, submission is silently "successful" without sending
}

export interface ContactFormErrors {
  name?: string;
  email?: string;
  message?: string;
  general?: string;
}

export interface ContactApiResponse {
  success: boolean;
  message: string;
}
