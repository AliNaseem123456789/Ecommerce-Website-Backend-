import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './orders.controller';
import { OrdersService } from './order.service';

describe('OrdersController', () => {
  let controller: OrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrdersService, useValue: {} }],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
