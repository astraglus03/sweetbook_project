import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import FormData = require('form-data');
import { ExternalApiException } from '../../common/exceptions';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

@Injectable()
export class SweetbookApiService {
  private readonly logger = new Logger(SweetbookApiService.name);
  private readonly client: AxiosInstance;
  private readonly maskedKey: string;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.getOrThrow<string>('SWEETBOOK_BASE_URL');
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.retryInterceptor(error),
    );

    const parts = apiKey.split('.');
    this.maskedKey =
      parts.length === 2
        ? `${parts[0].substring(0, 2)}****.****`
        : 'SB****.****';
  }

  private async retryInterceptor(error: AxiosError): Promise<unknown> {
    const config = error.config as
      | (AxiosError['config'] & { _retryCount?: number })
      | undefined;
    if (!config) return Promise.reject(error);
    const attempt = config._retryCount ?? 0;
    if (attempt >= MAX_RETRIES || !this.isRetryable(error)) {
      return Promise.reject(error);
    }
    config._retryCount = attempt + 1;
    const delay = this.getRetryDelayMs(error, attempt);
    const { message } = this.extractError(error);
    this.logger.warn(
      `${config.method?.toUpperCase() ?? 'REQ'} ${config.url} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${message} — retrying in ${delay}ms`,
    );
    await this.sleep(delay);
    return this.client.request(config);
  }

  private extractError(error: unknown): { message: string; details: unknown } {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      const message = data?.errors?.[0]?.message ?? error.message;
      return { message, details: data };
    }
    return { message: String(error), details: null };
  }

  private isRetryable(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true;
    const status = error.response?.status;
    if (status === undefined) return true; // network error
    if (status === 429) return true;
    if (status >= 500 && status <= 599) return true;
    return false;
  }

  private getRetryDelayMs(error: unknown, attempt: number): number {
    if (axios.isAxiosError(error)) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (!Number.isNaN(seconds)) return seconds * 1000;
      }
    }
    return BASE_BACKOFF_MS * Math.pow(2, attempt);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Book Specs ────────────────────────────────────────────

  async getBookSpecs(): Promise<unknown[]> {
    this.logger.log(`GET /book-specs [apiKey=${this.maskedKey}]`);
    try {
      const response = await this.client.get('/book-specs');
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(`GET /book-specs failed: ${message}`, details);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async getBookSpec(bookSpecUid: string): Promise<unknown> {
    this.logger.log(`GET /book-specs/${bookSpecUid} [apiKey=${this.maskedKey}]`);
    try {
      const response = await this.client.get(`/book-specs/${bookSpecUid}`);
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `GET /book-specs/${bookSpecUid} failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  // ─── Templates ─────────────────────────────────────────────

  async getTemplates(bookSpecUid: string): Promise<unknown[]> {
    this.logger.log(
      `GET /templates?bookSpecUid=${bookSpecUid} [apiKey=${this.maskedKey}]`,
    );
    try {
      const response = await this.client.get('/templates', {
        params: { bookSpecUid },
      });
      const body = response.data;
      const data = body.data ?? body;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.templates)
          ? data.templates
          : [];
      this.logger.log(
        `Templates for ${bookSpecUid}: ${list.length} items`,
      );
      return list;
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `GET /templates?bookSpecUid=${bookSpecUid} failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async getTemplateDetail(templateUid: string): Promise<unknown> {
    this.logger.log(
      `GET /templates/${templateUid} [apiKey=${this.maskedKey}]`,
    );
    try {
      const response = await this.client.get(`/templates/${templateUid}`);
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `GET /templates/${templateUid} failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  // ─── Books ─────────────────────────────────────────────────

  async createBook(params: {
    title: string;
    bookSpecUid: string;
    externalRef?: string;
    idempotencyKey: string;
  }): Promise<{ bookUid: string }> {
    this.logger.log(`POST /books [apiKey=${this.maskedKey}]`);
    try {
      const response = await this.client.post(
        '/books',
        {
          title: params.title,
          bookSpecUid: params.bookSpecUid,
          externalRef: params.externalRef,
        },
        { headers: { 'Idempotency-Key': params.idempotencyKey } },
      );
      const body = response.data;
      const data = body.data ?? body;
      return { bookUid: data.bookUid };
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(`POST /books failed: ${message}`, details);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async uploadPhotoToBook(
    bookUid: string,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<{ fileName: string }> {
    this.logger.log(
      `POST /books/${bookUid}/photos [apiKey=${this.maskedKey}]`,
    );
    try {
      const form = new FormData();
      form.append('file', fileBuffer, { filename: fileName });
      const response = await this.client.post(
        `/books/${bookUid}/photos`,
        form,
        { headers: { ...form.getHeaders() } },
      );
      const body = response.data;
      const data = body.data ?? body;
      return { fileName: data.fileName ?? fileName };
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `POST /books/${bookUid}/photos failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async addCover(
    bookUid: string,
    params: {
      templateUid: string;
      parameters?: Record<string, string>;
    },
  ): Promise<void> {
    this.logger.log(`POST /books/${bookUid}/cover [apiKey=${this.maskedKey}]`);
    try {
      const form = new FormData();
      form.append('templateUid', params.templateUid);
      if (params.parameters && Object.keys(params.parameters).length > 0) {
        form.append('parameters', JSON.stringify(params.parameters));
      }
      await this.client.post(`/books/${bookUid}/cover`, form, {
        headers: { ...form.getHeaders() },
      });
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `POST /books/${bookUid}/cover failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async addContents(
    bookUid: string,
    params: {
      templateUid: string;
      parameters?: Record<string, string | string[]>;
      breakBefore?: string;
    },
  ): Promise<void> {
    this.logger.log(
      `POST /books/${bookUid}/contents [apiKey=${this.maskedKey}]`,
    );
    try {
      const form = new FormData();
      form.append('templateUid', params.templateUid);
      if (params.parameters && Object.keys(params.parameters).length > 0) {
        form.append('parameters', JSON.stringify(params.parameters));
      }
      const query = params.breakBefore ? `?breakBefore=${params.breakBefore}` : '';
      await this.client.post(`/books/${bookUid}/contents${query}`, form, {
        headers: { ...form.getHeaders() },
      });
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `POST /books/${bookUid}/contents failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async finalizeBook(bookUid: string): Promise<void> {
    this.logger.log(
      `POST /books/${bookUid}/finalization [apiKey=${this.maskedKey}]`,
    );
    try {
      await this.client.post(`/books/${bookUid}/finalization`);
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `POST /books/${bookUid}/finalization failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async deleteBook(bookUid: string): Promise<void> {
    this.logger.log(`DELETE /books/${bookUid} [apiKey=${this.maskedKey}]`);
    try {
      await this.client.delete(`/books/${bookUid}`);
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `DELETE /books/${bookUid} failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async getBook(bookUid: string): Promise<unknown> {
    this.logger.log(`GET /books/${bookUid} [apiKey=${this.maskedKey}]`);
    try {
      const response = await this.client.get(`/books/${bookUid}`);
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `GET /books/${bookUid} failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  // ─── Credits ───────────────────────────────────────────────

  async getCredits(): Promise<{ balance: number; currency: string }> {
    this.logger.log(`GET /credits [apiKey=${this.maskedKey}]`);
    try {
      const response = await this.client.get('/credits');
      const body = response.data;
      const data = body.data ?? body;
      return { balance: data.balance, currency: data.currency ?? 'KRW' };
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(`GET /credits failed: ${message}`, details);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  // ─── Orders ────────────────────────────────────────────────

  async estimateOrder(
    items: Array<{ bookUid: string; quantity: number }>,
  ): Promise<unknown> {
    this.logger.log(`POST /orders/estimate [apiKey=${this.maskedKey}]`);
    try {
      const response = await this.client.post('/orders/estimate', { items });
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(`POST /orders/estimate failed: ${message}`, details);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async createOrder(params: {
    items: Array<{ bookUid: string; quantity: number }>;
    shipping: {
      recipientName: string;
      recipientPhone: string;
      postalCode: string;
      address1: string;
      address2?: string;
      memo?: string;
    };
    externalRef?: string;
    idempotencyKey: string;
  }): Promise<{ orderUid: string }> {
    this.logger.log(`POST /orders [apiKey=${this.maskedKey}]`);
    try {
      const response = await this.client.post(
        '/orders',
        {
          items: params.items,
          shipping: params.shipping,
          externalRef: params.externalRef,
        },
        { headers: { 'Idempotency-Key': params.idempotencyKey } },
      );
      const body = response.data;
      const data = body.data ?? body;
      return { orderUid: data.orderUid };
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(`POST /orders failed: ${message}`, details);

      if (axios.isAxiosError(error) && error.response?.status === 402) {
        const errData = error.response.data?.errors?.[0];
        throw new ExternalApiException(
          'ORDER_INSUFFICIENT_CREDITS',
          JSON.stringify({
            message: errData?.message ?? '충전금이 부족합니다',
            required: errData?.required,
            current: errData?.current,
            shortfall: (errData?.required ?? 0) - (errData?.current ?? 0),
          }),
        );
      }

      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async getOrder(orderUid: string): Promise<unknown> {
    this.logger.log(`GET /orders/${orderUid} [apiKey=${this.maskedKey}]`);
    try {
      const response = await this.client.get(`/orders/${orderUid}`);
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `GET /orders/${orderUid} failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async cancelOrder(
    orderUid: string,
    cancelReason: string,
  ): Promise<void> {
    this.logger.log(`POST /orders/${orderUid}/cancel [apiKey=${this.maskedKey}]`);
    try {
      await this.client.post(`/orders/${orderUid}/cancel`, { cancelReason });
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `POST /orders/${orderUid}/cancel failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async updateShipping(
    orderUid: string,
    shipping: Record<string, string>,
  ): Promise<void> {
    this.logger.log(
      `PATCH /orders/${orderUid}/shipping [apiKey=${this.maskedKey}]`,
    );
    try {
      await this.client.patch(`/orders/${orderUid}/shipping`, shipping);
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `PATCH /orders/${orderUid}/shipping failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  // ─── Sandbox Credits ───────────────────────────────────────

  async sandboxCharge(amount: number): Promise<unknown> {
    this.logger.log(
      `POST /credits/sandbox/charge [apiKey=${this.maskedKey}]`,
    );
    try {
      const response = await this.client.post('/credits/sandbox/charge', {
        amount,
      });
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const { message, details } = this.extractError(error);
      this.logger.error(
        `POST /credits/sandbox/charge failed: ${message}`,
        details,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }
}
