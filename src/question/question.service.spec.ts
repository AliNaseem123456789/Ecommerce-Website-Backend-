import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionService } from './question.service';

describe('QuestionService', () => {
  let service: QuestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionService,
        { provide: PrismaService, useValue: {} },
        { provide: MailService, useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get<QuestionService>(QuestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
