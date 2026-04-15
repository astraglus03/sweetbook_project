/**
 * sweetbook-client.ts
 * Sweetbook API standalone axios 클라이언트 (재시도 없이 심플하게).
 * src/external/sweetbook/sweetbook.service.ts 의 응답 shape를 그대로 따름.
 */

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

function maskKey(key: string): string {
  const parts = key.split('.');
  return parts.length === 2 ? `${parts[0].substring(0, 2)}****.****` : 'SB****.****';
}

export class SweetbookClient {
  private readonly client: AxiosInstance;
  private readonly masked: string;

  constructor(baseURL: string, apiKey: string) {
    this.masked = maskKey(apiKey);
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // 에러 응답 본문 풀어서 콘솔에 찍기 (Sweetbook validation 메시지 확인용)
    this.client.interceptors.response.use(
      (res) => res,
      (error) => {
        const status = error?.response?.status;
        const data = error?.response?.data;
        const url = error?.config?.url;
        const method = error?.config?.method?.toUpperCase();
        const idempotencyKey = error?.config?.headers?.['Idempotency-Key'];
        if (status && data) {
          const ikLine = idempotencyKey ? `\n  Idempotency-Key: ${idempotencyKey}` : '';
          console.error(
            `  [SB-ERR] ${method} ${url} → ${status}${ikLine}\n${JSON.stringify(
              data,
              null,
              2,
            )}`,
          );
        }
        return Promise.reject(error);
      },
    );
  }

  private unwrap(body: unknown): unknown {
    if (body && typeof body === 'object' && 'data' in (body as object)) {
      return (body as { data: unknown }).data;
    }
    return body;
  }

  // ── Book Specs ────────────────────────────────────────────────

  async getBookSpecs(): Promise<{ uid: string; [key: string]: unknown }[]> {
    console.log(`  [SB] GET /book-specs [${this.masked}]`);
    const res = await this.client.get('/book-specs');
    const data = this.unwrap(res.data);
    return Array.isArray(data) ? data : [];
  }

  async getBookSpec(
    bookSpecUid: string,
  ): Promise<{ uid: string; pageMin: number; pageMax: number; pageIncrement: number; [key: string]: unknown }> {
    console.log(`  [SB] GET /book-specs/${bookSpecUid}`);
    const res = await this.client.get(`/book-specs/${bookSpecUid}`);
    const data = this.unwrap(res.data) as { uid: string; pageMin: number; pageMax: number; pageIncrement: number };
    return data;
  }

  // ── Templates ────────────────────────────────────────────────

  async getTemplates(
    bookSpecUid: string,
  ): Promise<{ templateUid: string; templateKind: string; theme: string; [key: string]: unknown }[]> {
    console.log(`  [SB] GET /templates?bookSpecUid=${bookSpecUid}`);
    const res = await this.client.get('/templates', { params: { bookSpecUid } });
    const body = this.unwrap(res.data);
    if (Array.isArray(body)) return body;
    if (body && typeof body === 'object' && Array.isArray((body as { templates?: unknown[] }).templates)) {
      return (body as { templates: unknown[] }).templates as { templateUid: string; templateKind: string; theme: string }[];
    }
    return [];
  }

  async getTemplateDetail(
    templateUid: string,
  ): Promise<{ parameters?: { definitions?: Record<string, { binding: string }> }; [key: string]: unknown }> {
    console.log(`  [SB] GET /templates/${templateUid}`);
    const res = await this.client.get(`/templates/${templateUid}`);
    return (this.unwrap(res.data) as { parameters?: { definitions?: Record<string, { binding: string }> } }) ?? {};
  }

  // ── Books ─────────────────────────────────────────────────────

  async createBook(params: {
    title: string;
    bookSpecUid: string;
    externalRef?: string;
    idempotencyKey: string;
  }): Promise<{ bookUid: string }> {
    console.log(`  [SB] POST /books (title=${params.title})`);
    const res = await this.client.post(
      '/books',
      { title: params.title, bookSpecUid: params.bookSpecUid, externalRef: params.externalRef },
      { headers: { 'Idempotency-Key': params.idempotencyKey } },
    );
    const data = this.unwrap(res.data) as { bookUid: string };
    return { bookUid: data.bookUid };
  }

  async uploadPhotoToBook(
    bookUid: string,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<{ fileName: string }> {
    console.log(`  [SB] POST /books/${bookUid}/photos (${fileName})`);
    const form = new FormData();
    form.append('file', fileBuffer, { filename: fileName });
    const res = await this.client.post(`/books/${bookUid}/photos`, form, {
      headers: { ...form.getHeaders() },
    });
    const data = this.unwrap(res.data) as { fileName?: string };
    return { fileName: data.fileName ?? fileName };
  }

  async addCover(
    bookUid: string,
    params: { templateUid: string; parameters?: Record<string, string> },
  ): Promise<void> {
    console.log(`  [SB] POST /books/${bookUid}/cover`);
    const form = new FormData();
    form.append('templateUid', params.templateUid);
    if (params.parameters && Object.keys(params.parameters).length > 0) {
      form.append('parameters', JSON.stringify(params.parameters));
    }
    await this.client.post(`/books/${bookUid}/cover`, form, {
      headers: { ...form.getHeaders() },
    });
  }

  async addContents(
    bookUid: string,
    params: {
      templateUid: string;
      parameters?: Record<string, string | string[]>;
      breakBefore?: 'page' | 'column' | 'none';
    },
  ): Promise<void> {
    const query = params.breakBefore ? `?breakBefore=${params.breakBefore}` : '';
    const form = new FormData();
    form.append('templateUid', params.templateUid);
    if (params.parameters && Object.keys(params.parameters).length > 0) {
      form.append('parameters', JSON.stringify(params.parameters));
    }
    await this.client.post(`/books/${bookUid}/contents${query}`, form, {
      headers: { ...form.getHeaders() },
    });
  }

  async finalizeBook(bookUid: string): Promise<void> {
    console.log(`  [SB] POST /books/${bookUid}/finalization`);
    await this.client.post(`/books/${bookUid}/finalization`);
  }

  // ── Credits ───────────────────────────────────────────────────

  async getCredits(): Promise<{ balance: number; currency: string }> {
    console.log(`  [SB] GET /credits`);
    const res = await this.client.get('/credits');
    const data = this.unwrap(res.data) as { balance: number; currency?: string };
    return { balance: data.balance, currency: data.currency ?? 'KRW' };
  }

  async sandboxCharge(amount: number): Promise<{ balance: number }> {
    console.log(`  [SB] POST /credits/sandbox/charge (amount=${amount})`);
    const res = await this.client.post('/credits/sandbox/charge', { amount });
    return (this.unwrap(res.data) as { balance: number }) ?? { balance: 0 };
  }

  // ── Orders ────────────────────────────────────────────────────

  async estimateOrder(
    items: Array<{ bookUid: string; quantity: number }>,
  ): Promise<{ totalPrice?: number; [key: string]: unknown }> {
    console.log(`  [SB] POST /orders/estimate`);
    const res = await this.client.post('/orders/estimate', { items });
    return (this.unwrap(res.data) as { totalPrice?: number }) ?? {};
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
    console.log(`  [SB] POST /orders (idempotencyKey=${params.idempotencyKey})`);
    const res = await this.client.post(
      '/orders',
      { items: params.items, shipping: params.shipping, externalRef: params.externalRef },
      { headers: { 'Idempotency-Key': params.idempotencyKey } },
    );
    const data = this.unwrap(res.data) as { orderUid: string };
    return { orderUid: data.orderUid };
  }

  // ── Webhooks (sandbox test) ───────────────────────────────────

  async triggerWebhookTest(eventType: string): Promise<void> {
    console.log(`  [SB] POST /webhooks/test (eventType=${eventType})`);
    await this.client.post('/webhooks/test', { eventType });
  }
}

export function createSweetbookClient(): SweetbookClient {
  const baseURL = process.env.SWEETBOOK_BASE_URL;
  const apiKey = process.env.SWEETBOOK_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error('환경변수 SWEETBOOK_BASE_URL, SWEETBOOK_API_KEY 가 필요합니다.');
  }
  return new SweetbookClient(baseURL, apiKey);
}
