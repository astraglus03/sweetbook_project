import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { In, Repository } from 'typeorm';
import { Group } from '../groups/entities/group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { EmailService } from '../../common/email/email.service';

const REMINDER_OFFSETS = [
  { days: 3, type: 'UPLOAD_REMINDER_D3' },
  { days: 1, type: 'UPLOAD_REMINDER_D1' },
];

const ACTIVE_STATUSES = ['COLLECTING', 'EDITING'];

@Injectable()
export class ReminderCron {
  private readonly logger = new Logger(ReminderCron.name);

  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepository: Repository<GroupMember>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /** 매일 09:00 KST — 모임 eventDate 기준 D-3/D-1 업로드 마감 리마인더 */
  @Cron('0 0 9 * * *', { timeZone: 'Asia/Seoul' })
  async sendReminders(): Promise<{
    total: number;
    perOffset: Record<string, number>;
  }> {
    const perOffset: Record<string, number> = {};
    let total = 0;

    for (const { days, type } of REMINDER_OFFSETS) {
      const targetDate = this.dateStringInKst(days);
      const groups = await this.groupRepository
        .createQueryBuilder('g')
        .where('g.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
        .andWhere('g.eventDate = :date', { date: targetDate })
        .getMany();

      let count = 0;
      for (const group of groups) {
        count += await this.notifyGroup(group, type, days);
      }
      perOffset[type] = count;
      total += count;
      this.logger.log(
        `Reminder ${type}: ${groups.length} groups on ${targetDate} → ${count} notifications`,
      );
    }

    return { total, perOffset };
  }

  private async notifyGroup(
    group: Group,
    type: string,
    daysLeft: number,
  ): Promise<number> {
    const members = await this.memberRepository.find({
      where: { groupId: group.id },
    });
    if (members.length === 0) return 0;

    const userIds = members.map((m) => m.userId);
    const alreadySent = await this.notificationRepository
      .createQueryBuilder('n')
      .select('n.userId', 'userId')
      .where('n.groupId = :groupId', { groupId: group.id })
      .andWhere('n.type = :type', { type })
      .andWhere('n.userId IN (:...userIds)', { userIds })
      .getRawMany<{ userId: number }>();

    const sentSet = new Set(alreadySent.map((r) => r.userId));
    const targets = userIds.filter((id) => !sentSet.has(id));
    if (targets.length === 0) return 0;

    const title =
      daysLeft === 1
        ? `내일이 마감! '${group.name}' 사진 업로드 서둘러주세요`
        : `'${group.name}' 모임이 ${daysLeft}일 남았어요`;
    const message =
      daysLeft === 1
        ? '아직 못 올린 사진이 있다면 지금 올려주세요 📸 마감 후에는 포토북 편집이 시작돼요.'
        : `모임일까지 ${daysLeft}일 남았어요. 빠진 사진이 없는지 확인해주세요.`;

    const rows = targets.map((userId) =>
      this.notificationRepository.create({
        userId,
        groupId: group.id,
        type,
        title,
        message,
        isRead: false,
      }),
    );
    await this.notificationRepository.save(rows);

    // 이메일 병렬 발송 (실패해도 인앱 알림은 이미 저장됨)
    const users = await this.userRepository.find({
      where: { id: In(targets) },
    });
    const feBaseUrl = this.configService.getOrThrow<string>('CORS_ORIGIN');
    const groupLink = `${feBaseUrl}/groups/${group.id}`;
    await Promise.all(
      users
        .filter((u) => !!u.email)
        .map((u) =>
          this.emailService.sendUploadReminder(
            u.email,
            u.name ?? '멤버',
            group.name,
            daysLeft,
            groupLink,
          ),
        ),
    );

    return rows.length;
  }

  private dateStringInKst(daysFromToday: number): string {
    const now = new Date();
    const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
    const kst = new Date(kstMs);
    kst.setUTCDate(kst.getUTCDate() + daysFromToday);
    const y = kst.getUTCFullYear();
    const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const d = String(kst.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
