// API request/response models (mirrors the Rust hierarchy's models.rs).

export interface RegisterKeyRequest {
  value: string;
  services: string[];
}

export interface RotateKeyRequest {
  placeholder: string;
  newValue?: string;
}

export interface HealthResponse {
  ok: boolean;
  version: string;
}

export interface ErrorResponse {
  error: string;
}

export const ONECLI_VERSION = '0.1.0';
