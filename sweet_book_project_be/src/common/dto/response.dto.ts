export class ResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string };
  meta?: { page: number; limit: number; total: number; totalPages: number };
}
