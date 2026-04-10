import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AuthProvider = 'local' | 'google' | 'kakao';

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
@Index('idx_users_provider_lookup', ['provider', 'providerUserId'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: 'local' })
  provider: AuthProvider;

  @Column({ type: 'varchar', nullable: true })
  providerUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
