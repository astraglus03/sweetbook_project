import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import FormData = require('form-data');
import { ExternalApiException } from '../../common/exceptions';

@Injectable()
export class SweetbookApiService {
  private readonly logger = new Logger(SweetbookApiService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.getOrThrow<string>('SWEETBOOK_BASE_URL');
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private maskApiKey(key: string): string {
    const parts = key.split('.');
    if (parts.length === 2) {
      return `${parts[0].substring(0, 2)}****.****`;
    }
    return 'SB****.****';
  }

  async getBookSpecs(): Promise<unknown[]> {
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(
      `GET /book-specs [apiKey=${this.maskApiKey(apiKey)}]`,
    );
    try {
      const response = await this.client.get('/book-specs');
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(`GET /book-specs failed: ${message}`);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async getBookSpec(bookSpecUid: string): Promise<unknown> {
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(
      `GET /book-specs/${bookSpecUid} [apiKey=${this.maskApiKey(apiKey)}]`,
    );
    try {
      const response = await this.client.get(`/book-specs/${bookSpecUid}`);
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(`GET /book-specs/${bookSpecUid} failed: ${message}`);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async getTemplates(bookSpecUid: string): Promise<unknown[]> {
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(
      `GET /templates?bookSpecUid=${bookSpecUid} [apiKey=${this.maskApiKey(apiKey)}]`,
    );
    try {
      const response = await this.client.get('/templates', {
        params: { bookSpecUid },
      });
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(
        `GET /templates?bookSpecUid=${bookSpecUid} failed: ${message}`,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async createBook(params: {
    title: string;
    bookSpecUid: string;
    externalRef?: string;
    idempotencyKey: string;
  }): Promise<{ bookUid: string }> {
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(`POST /books [apiKey=${this.maskApiKey(apiKey)}]`);
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
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(`POST /books failed: ${message}`);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async uploadPhotoToBook(
    bookUid: string,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<{ fileName: string }> {
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(
      `POST /books/${bookUid}/photos [apiKey=${this.maskApiKey(apiKey)}]`,
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
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(`POST /books/${bookUid}/photos failed: ${message}`);
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
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(
      `POST /books/${bookUid}/cover [apiKey=${this.maskApiKey(apiKey)}]`,
    );
    try {
      await this.client.post(`/books/${bookUid}/cover`, params);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(`POST /books/${bookUid}/cover failed: ${message}`);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async addContents(
    bookUid: string,
    params: {
      templateUid: string;
      parameters?: Record<string, string>;
      breakBefore?: string;
    },
  ): Promise<void> {
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(
      `POST /books/${bookUid}/contents [apiKey=${this.maskApiKey(apiKey)}]`,
    );
    try {
      await this.client.post(`/books/${bookUid}/contents`, params);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(`POST /books/${bookUid}/contents failed: ${message}`);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async finalizeBook(bookUid: string): Promise<void> {
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(
      `POST /books/${bookUid}/finalization [apiKey=${this.maskApiKey(apiKey)}]`,
    );
    try {
      await this.client.post(`/books/${bookUid}/finalization`);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(
        `POST /books/${bookUid}/finalization failed: ${message}`,
      );
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async deleteBook(bookUid: string): Promise<void> {
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(
      `DELETE /books/${bookUid} [apiKey=${this.maskApiKey(apiKey)}]`,
    );
    try {
      await this.client.delete(`/books/${bookUid}`);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(`DELETE /books/${bookUid} failed: ${message}`);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }

  async getBook(bookUid: string): Promise<unknown> {
    const apiKey = this.configService.getOrThrow<string>('SWEETBOOK_API_KEY');
    this.logger.log(
      `GET /books/${bookUid} [apiKey=${this.maskApiKey(apiKey)}]`,
    );
    try {
      const response = await this.client.get(`/books/${bookUid}`);
      const body = response.data;
      return body.data ?? body;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.errors?.[0]?.message ?? error.message)
        : String(error);
      this.logger.error(`GET /books/${bookUid} failed: ${message}`);
      throw new ExternalApiException('SWEETBOOK_API_ERROR', message);
    }
  }
}
