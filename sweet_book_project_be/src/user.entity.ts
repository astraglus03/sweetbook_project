import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity() // JPA의 @Entity 랑 똑같음
export class User {
  @PrimaryGeneratedColumn() // JPA의 @Id @GeneratedValue(strategy=IDENTITY)
  id: number;

  @Column({ unique: true }) // JPA의 @Column(unique=true)
  email: string;

  @Column({ nullable: true }) // JPA의 @Column(nullable=true)
  name: string;

  @CreateDateColumn() // JPA의 @CreatedDate
  createdAt: Date;
}
