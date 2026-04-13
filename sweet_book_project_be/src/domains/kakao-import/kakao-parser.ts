import { Logger } from '@nestjs/common';

const logger = new Logger('KakaoParser');

const MESSAGE_REGEX =
  /^(오전|오후)\s(\d+):(\d+),\s([^:]+)\s:\s(사진|동영상|이모티콘|.+)$/;
const DATE_HEADER_REGEX = /^-+\s(\d{4})년\s(\d+)월\s(\d+)일\s.+?\s-+$/;

export interface ParsedPhotoMessage {
  timestamp: Date;
  uploaderName: string;
}

/** 카카오톡 Android 내보내기 txt를 파싱하여 사진 메시지만 추출한다. */
export function parseKakaoTxt(content: string): ParsedPhotoMessage[] {
  const lines = content.split('\n');
  const messages: ParsedPhotoMessage[] = [];
  let currentDate: Date | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const dateMatch = line.match(DATE_HEADER_REGEX);
    if (dateMatch) {
      currentDate = new Date(+dateMatch[1], +dateMatch[2] - 1, +dateMatch[3]);
      continue;
    }

    const msgMatch = line.match(MESSAGE_REGEX);
    if (!msgMatch || !currentDate) continue;

    const [, ampm, hhStr, mmStr, name, body] = msgMatch;
    if (body !== '사진') continue; // 사진 메시지만 관심

    let hour = +hhStr;
    if (ampm === '오후' && hour !== 12) hour += 12;
    if (ampm === '오전' && hour === 12) hour = 0;

    const timestamp = new Date(currentDate);
    timestamp.setHours(hour, +mmStr, 0, 0);

    messages.push({
      timestamp,
      uploaderName: name.trim(),
    });
  }

  logger.log(`Parsed ${messages.length} photo messages from txt`);
  return messages;
}

/** 이미지 파일명에서 timestamp 추출 (실패 시 null) */
export function extractImageTimestamp(filename: string): number | null {
  const base = filename.split('/').pop() ?? filename;
  const match = base.match(/^(\d{13})/); // 13자리 unix ms
  if (match) return Number(match[1]);
  return null;
}

/** 카톡 닉네임 정규화 — 이모지/공백/특수문자 제거 후 lowercase */
export function normalizeKakaoName(name: string): string {
  return name
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim()
    .toLowerCase();
}
