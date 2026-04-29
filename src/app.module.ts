import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { SupabaseModule } from './supabase/supabase.module';
import { CategoriesModule } from './categories/categories.module';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewModule } from './review/review.module';
import { QuestionModule } from './question/question.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available everywhere
    }),
    ProductsModule,
    SupabaseModule,
    CategoriesModule,
    AccountModule,
    AuthModule,
    CartModule,
    WishlistModule,
    ReviewModule,
    QuestionModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
