import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthProvider, User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  findByProvider(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<User | null> {
    return this.repo.findOne({ where: { provider, providerUserId } });
  }

  create(partial: Partial<User>): User {
    return this.repo.create(partial);
  }

  save(user: User): Promise<User> {
    return this.repo.save(user);
  }
}
