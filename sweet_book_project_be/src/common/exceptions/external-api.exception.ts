import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class ExternalApiException extends AppException {
  constructor(code: string, message: string) {
    super(code, message, HttpStatus.BAD_GATEWAY);
  }
}
