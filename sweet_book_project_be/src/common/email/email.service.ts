import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.fromAddress = this.configService.get<string>(
      'SMTP_FROM',
      'GroupBook <noreply@groupbook.kr>',
    );

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP configured: ${host}:${port}`);
    } else {
      this.logger.warn(
        'SMTP not configured — emails will be logged to console only',
      );
    }
  }

  async sendPasswordReset(
    to: string,
    name: string,
    resetLink: string,
  ): Promise<void> {
    const subject = '[GroupBook] 비밀번호 재설정';
    const html = this.buildResetHtml(name, resetLink);

    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL] Reset link: ${resetLink}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(
        `Password reset email sent to ${to} (messageId=${info.messageId})`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send reset email to ${to}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendShippingReminder(
    to: string,
    name: string,
    bookTitle: string,
    orderLink: string,
  ): Promise<void> {
    const subject = `[GroupBook] "${bookTitle}" 배송 정보를 입력해주세요`;
    const html = this.buildShippingReminderHtml(name, bookTitle, orderLink);

    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL] Order link: ${orderLink}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(
        `Shipping reminder sent to ${to} (messageId=${info.messageId})`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send reminder email to ${to}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async sendUploadReminder(
    to: string,
    name: string,
    groupName: string,
    daysLeft: number,
    groupLink: string,
  ): Promise<void> {
    const subject = `[GroupBook] "${groupName}" 사진 업로드 마감까지 ${daysLeft}일 남았어요`;
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8F5F0;font-family:'Inter',sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#FFFFFF;border-radius:16px;border:1px solid #E5E0D8;overflow:hidden;">
    <div style="background:#1A1A1A;padding:32px 40px;text-align:center;">
      <span style="color:#D4916E;font-size:20px;font-weight:700;">GroupBook</span>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">${name}님, 사진을 업로드해주세요</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6B6B6B;line-height:1.6;">
        "${groupName}" 모임의 사진 업로드 마감까지 <strong>${daysLeft}일</strong> 남았습니다.
      </p>
      <a href="${groupLink}" style="display:inline-block;padding:14px 28px;background:#D4916E;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;">
        사진 업로드하기
      </a>
    </div>
  </div>
</body></html>`;

    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] Upload reminder to: ${to}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Upload reminder sent to ${to}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send upload reminder to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private buildShippingReminderHtml(
    name: string,
    bookTitle: string,
    orderLink: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8F5F0;font-family:'Inter',sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#FFFFFF;border-radius:16px;border:1px solid #E5E0D8;overflow:hidden;">
    <div style="background:#1A1A1A;padding:32px 40px;text-align:center;">
      <span style="color:#D4916E;font-size:20px;font-weight:700;">GroupBook</span>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">배송 정보 입력이 필요합니다</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6B6B6B;line-height:1.6;">
        안녕하세요, ${name}님.<br>
        <b>${bookTitle}</b> 포토북 주문이 진행 중입니다.<br>
        아래 버튼을 눌러 배송 정보를 입력해주세요.
      </p>
      <a href="${orderLink}"
         style="display:block;width:100%;padding:14px 0;background:#D4916E;color:#FFFFFF;text-align:center;border-radius:9999px;font-size:15px;font-weight:600;text-decoration:none;">
        배송 정보 입력하기
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9B9B9B;line-height:1.5;">
        모든 멤버의 배송 정보가 모이면 주문이 확정됩니다.
      </p>
    </div>
    <div style="padding:20px 40px;background:#F8F5F0;border-top:1px solid #E5E0D8;">
      <p style="margin:0;font-size:11px;color:#9B9B9B;text-align:center;">
        &copy; GroupBook. 모임 기록 포토북 서비스.
      </p>
    </div>
  </div>
</body>
</html>`.trim();
  }

  private buildResetHtml(name: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8F5F0;font-family:'Inter',sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#FFFFFF;border-radius:16px;border:1px solid #E5E0D8;overflow:hidden;">
    <!-- Header -->
    <div style="background:#1A1A1A;padding:32px 40px;text-align:center;">
      <span style="color:#D4916E;font-size:20px;font-weight:700;">GroupBook</span>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1A1A1A;">비밀번호 재설정</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6B6B6B;line-height:1.6;">
        안녕하세요, ${name}님.<br>
        아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.
      </p>
      <a href="${resetLink}"
         style="display:block;width:100%;padding:14px 0;background:#D4916E;color:#FFFFFF;text-align:center;border-radius:9999px;font-size:15px;font-weight:600;text-decoration:none;">
        비밀번호 재설정
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#9B9B9B;line-height:1.5;">
        이 링크는 30분간 유효합니다.<br>
        본인이 요청하지 않았다면 이 이메일을 무시해주세요.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 40px;background:#F8F5F0;border-top:1px solid #E5E0D8;">
      <p style="margin:0;font-size:11px;color:#9B9B9B;text-align:center;">
        &copy; GroupBook. 모임 기록 포토북 서비스.
      </p>
    </div>
  </div>
</body>
</html>`.trim();
  }
}
