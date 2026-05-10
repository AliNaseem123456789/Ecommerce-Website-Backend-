# E-Commerce Platform - Full Stack Shopping Solution

[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-008CDD?style=for-the-badge&logo=stripe)](https://stripe.com/)

## Features

### Customer Features
- **Product Catalog** - Browse with category filters and sorting
- **Advanced Search** - Real-time search with suggestions
- **Shopping Cart** - Add/remove items, update quantities
- **Wishlist** - Save favorite products
- **Reviews & Ratings** - Share product feedback
- **Q&A System** - Ask questions about products
- **User Account** - Dashboard, orders, addresses
- **Stripe Payments** - Secure checkout
- **Order Tracking** - View order history
- **AI Chatbot** - 24/7 shopping assistant

### Admin Features (Backend)
- Product management
- Category management
- Order processing
- Inventory tracking

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Material-UI, React Router, Axios |
| **Backend** | NestJS, Node.js |
| **Database** | Supabase (PostgreSQL) |
| **Payments** | Stripe API |
| **AI Chatbot** | External chatbot service |
| **Deployment** | Vercel (FE), Railway/Render (BE) |

##  Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free)
- Stripe account (free)
- NestJS CLI (`npm i -g @nestjs/cli`)

### Installation

## 1. Clone repository
```bash
git clone https://github.com/yourusername/ecommerce-platform.git
cd ecommerce-platform
```
## 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run start:dev
```

## 3. Frontend Setup (new terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

# Environment Variables
### Backend (.env)
```bash
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_key
FRONTEND_URL=http://localhost:3001
```

### Frontend (.env)
```bash
VITE_API_URL=https://ecommerce-website-backend-k4vc.onrender.com/api/v1
VITE_CHATBOT_URL=https://chatbot-gateway-production.up.railway.app
```

## Project Structure
```bash
ecommerce-platform/
├── frontend/
│   ├── public/
│   │   
│   ├── src/
│   │   ├── api/
│   │   │   └── apiClient.js
│   │   │
│   │   ├── assets/
│   │   │   ├── Logos/
│   │   │   ├── banners/
│   │   │   ├── products/
│   │   │   └── indexing.py
│   │   │
│   │   ├── components/
│   │   │   ├── Accountx/
│   │   │   │   ├── AccountDetailsTab.jsx
│   │   │   │   ├── AddressesTab.jsx
│   │   │   │   ├── CompareTab.jsx
│   │   │   │   ├── DashboardTab.jsx
│   │   │   │   ├── DownloadsTab.jsx
│   │   │   │   ├── OrdersTab.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── WishlistTab.jsx
│   │   │   │
│   │   │   ├── Checkout/
│   │   │   │   ├── CheckoutDeliver.jsx
│   │   │   │   ├── CheckoutGuest.jsx
│   │   │   │   ├── CheckoutPayment.jsx
│   │   │   │   ├── CheckoutPromo.jsx
│   │   │   │   ├── CheckoutSavedAdresses.jsx
│   │   │   │   ├── CheckoutShipping.jsx
│   │   │   │   ├── CheckoutSummary.jsx
│   │   │   │   └── StripePaymentForm.jsx
│   │   │   │
│   │   │   ├── Landing/
│   │   │   │   ├── BrandStatements.jsx
│   │   │   │   ├── HeroSection.jsx
│   │   │   │   ├── HowItWorks.jsx
│   │   │   │   ├── LandingNavbar.jsx
│   │   │   │   ├── LandingProductCard.jsx
│   │   │   │   ├── MainBanner.jsx
│   │   │   │   ├── ProductSlider.jsx
│   │   │   │   ├── SideBySide.jsx
│   │   │   │   ├── Testimonials.jsx
│   │   │   │   └── WhyShopWithUs.jsx
│   │   │   │
│   │   │   ├── ProductDetails/
│   │   │   │   ├── AddToCartButton.jsx
│   │   │   │   ├── AskQuestionButton.jsx
│   │   │   │   ├── ProductGallery.jsx
│   │   │   │   ├── ProductTabs.jsx
│   │   │   │   └── WishlistButton.jsx
│   │   │   │
│   │   │   ├── context/
│   │   │   │   ├── AuthContext.jsx
│   │   │   │   ├── CartContext.jsx
│   │   │   │   └── WishlistContext.jsx
│   │   │   │
│   │   │   ├── icons/
│   │   │   │   └── GridIcons.jsx
│   │   │   │
│   │   │   ├── AuthModal.jsx
│   │   │   ├── Breadcrumbs.jsx
│   │   │   ├── CartSidebar.jsx
│   │   │   ├── CategoryFilter.jsx
│   │   │   ├── FeaturedCarousel.jsx
│   │   │   ├── FloatingChat.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── LiveViewers.jsx
│   │   │   ├── MobileSearch.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProtectedRoutes.jsx
│   │   │   ├── QuestionModal.jsx
│   │   │   ├── QuickViewModal.jsx
│   │   │   └── ReviewModal.jsx
│   │   │
│   │   ├── data/
│   │   │   ├── faqData.js
│   │   │   ├── featuresData.jsx
│   │   │   ├── heroData.js
│   │   │   ├── stepsData.js
│   │   │   └── testimoinialsData.js
│   │   │
│   │   ├── pages/
│   │   │   ├── static/
│   │   │   │   ├── AboutUs.jsx
│   │   │   │   ├── ContactUs.jsx
│   │   │   │   ├── FAQ.jsx
│   │   │   │   ├── PrivacyPolicy.jsx
│   │   │   │   ├── RefundReturns.jsx
│   │   │   │   └── TermsAndConditions.jsx
│   │   │   │
│   │   │   ├── Account.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginRequired.jsx
│   │   │   ├── NotFoundPage.jsx
│   │   │   ├── ProductDetails.jsx
│   │   │   ├── SearchResults.jsx
│   │   │   ├── Shop.jsx
│   │   │   └── Wishlist.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── account.service.js
│   │   │   ├── addresses.service.js
│   │   │   ├── auth.service.js
│   │   │   ├── categories.service.js
│   │   │   ├── landing.service.js
│   │   │   ├── orders.service.js
│   │   │   ├── payments.service.js
│   │   │   ├── product.service.js
│   │   │   ├── question.service.js
│   │   │   ├── review.service.js
│   │   │   ├── search.service.js
│   │   │   └── shop.service.js
│   │   │
│   │   ├── styles/
│   │   │   ├── wishlist.module.css.js
│   │   │   ├── AddressesTab.css
│   │   │   ├── AuthModal.module.css
│   │   │   ├── CartSidebar.module.css
│   │   │   ├── cart.module.css
│   │   │   ├── CheckoutGuest.css
│   │   │   ├── components.module.css
│   │   │   ├── FloatingChat.css
│   │   │   ├── LandingPage.module.css
│   │   │   ├── LandingProduct.css
│   │   │   ├── Navbar.module.css
│   │   │   ├── ProductCard.module.css
│   │   │   ├── productUI.module.css
│   │   │   ├── SideBar.css
│   │   │   ├── StaticPages.css
│   │   │   ├── WishlistTab.css
│   │   │   
│   │   │
│   │   ├── utils/
│   │   │   └── jwt.js
│   │   │
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   │   ├── account/
│   │   │   ├── account.controller.spec.ts
│   │   │   ├── account.controller.ts
│   │   │   ├── account.module.ts
│   │   │   ├── account.service.spec.ts
│   │   │   └── account.service.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.controller.spec.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── auth.service.ts
│   │   │   └── jwt.strategy.ts
│   │   │
│   │   ├── cart/
│   │   │   ├── cart.controller.spec.ts
│   │   │   ├── cart.controller.ts
│   │   │   ├── cart.module.ts
│   │   │   ├── cart.service.spec.ts
│   │   │   └── cart.service.ts
│   │   │
│   │   ├── categories/
│   │   │   ├── dto/
│   │   │   │   ├── create-category.dto.ts
│   │   │   │   └── update-category.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── category.entity.ts
│   │   │   ├── categories.controller.ts
│   │   │   ├── categories.module.ts
│   │   │   └── categories.service.ts
│   │   │
│   │   ├── orders/
│   │   │   ├── order.service.ts
│   │   │   ├── orders.controller.spec.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.module.ts
│   │   │   └── orders.service.spec.ts
│   │   │
│   │   ├── payments/
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.module.ts
│   │   │   └── payments.service.ts
│   │   │
│   │   ├── products/
│   │   │   ├── dto/
│   │   │   │   └── get-products.dto.ts
│   │   │   ├── products.controller.spec.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.module.ts
│   │   │   ├── products.service.spec.ts
│   │   │   └── products.service.ts
│   │   │
│   │   ├── question/
│   │   │   ├── question.controller.spec.ts
│   │   │   ├── question.controller.ts
│   │   │   ├── question.module.ts
│   │   │   ├── question.service.spec.ts
│   │   │   └── question.service.ts
│   │   │
│   │   ├── review/
│   │   │   ├── review.controller.spec.ts
│   │   │   ├── review.controller.ts
│   │   │   ├── review.module.ts
│   │   │   ├── review.service.spec.ts
│   │   │   └── review.service.ts
│   │   │
│   │   ├── supabase/
│   │   │   ├── supabase.client.ts
│   │   │   └── supabase.module.ts
│   │   │
│   │   ├── wishlist/
│   │   │   ├── wishlist.controller.spec.ts
│   │   │   ├── wishlist.controller.ts
│   │   │   ├── wishlist.module.ts
│   │   │   ├── wishlist.service.spec.ts
│   │   │   └── wishlist.service.ts
│   │   │
│   │   ├── app.controller.spec.ts
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── app.service.ts
│   │   └── main.ts
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   └── schema.prisma
│   │
│   ├── test/
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   │
│   ├── .env.example
│   ├── eslint.config.mjs
│   ├── nest-cli.json
│   ├── package.json
│   ├── prisma.config.ts
│   ├── tsconfig.build.json
│   └── tsconfig.json
│
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── scripts/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
└── README.md
```
## API Endpoints

| Module | Endpoint | Methods |
|--------|----------|---------|
| Auth | `/api/v1/auth` | POST signup/login, GET me |
| Products | `/api/v1/products` | GET, GET/:id, search, featured |
| Categories | `/api/v1/categories` | GET |
| Cart | `/api/v1/cart` | GET, POST, PUT, DELETE |
| Wishlist | `/api/v1/wishlist` | GET, POST toggle |
| Orders | `/api/v1/orders` | GET my-orders, POST place |
| Payments | `/api/v1/payments` | POST create-payment-intent |
| Reviews | `/api/v1/reviews` | POST, GET/:productId |
| Questions | `/api/v1/questions` | POST, GET/:productId |
| Account | `/api/v1/account` | GET/POST addresses |

# Database
```bash
create table public.categories (
  category_id serial not null,
  name character varying(100) not null,
  constraint categories_pkey primary key (category_id),
  constraint categories_name_key unique (name)
) TABLESPACE pg_default;


create table public.products (
  product_id serial not null,
  category_id integer null,
  name character varying(200) not null,
  description text null,
  price numeric(10, 2) not null,
  stock integer null default 0,
  avg_rating numeric(3, 2) null default 0,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint products_pkey primary key (product_id),
  constraint products_category_id_fkey foreign KEY (category_id) references categories (category_id)
) TABLESPACE pg_default;


create table public.wishlist_test (
  wishlist_item_id bigserial not null,
  user_id text not null,
  product_id integer not null,
  added_at timestamp without time zone null default now(),
  constraint wishlist_test_pkey primary key (wishlist_item_id),
  constraint wishlist_test_product_id_fkey foreign KEY (product_id) references products (product_id) on delete CASCADE
) TABLESPACE pg_default;

create table public.orders (
  order_id uuid not null default gen_random_uuid (),
  user_id uuid null,
  status text null default 'pending'::text,
  subtotal numeric(10, 2) null,
  shipping numeric(10, 2) null,
  tax numeric(10, 2) null,
  total numeric(10, 2) null,
  created_at timestamp without time zone null default now(),
  constraint orders_pkey primary key (order_id),
  constraint orders_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.order_items (
  item_id bigserial not null,
  order_id uuid null,
  product_id integer null,
  quantity integer null default 1,
  price numeric(10, 2) null,
  constraint order_items_pkey primary key (item_id),
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (order_id) on delete CASCADE,
  constraint order_items_product_id_fkey foreign KEY (product_id) references products (product_id)
) TABLESPACE pg_default;

create table public.product_questions (
  question_id serial not null,
  product_id integer null,
  name character varying(100) not null,
  email character varying(100) not null,
  question text not null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint product_questions_pkey primary key (question_id),
  constraint product_questions_product_id_fkey foreign KEY (product_id) references products (product_id) on delete CASCADE
) TABLESPACE pg_default;

create table public.product_reviews (
  review_id serial not null,
  product_id integer null,
  name character varying(100) not null,
  email character varying(100) not null,
  title character varying(200) not null,
  review text not null,
  rating numeric(2, 1) not null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint product_reviews_pkey primary key (review_id),
  constraint product_reviews_product_id_fkey foreign KEY (product_id) references products (product_id) on delete CASCADE,
  constraint product_reviews_rating_check check (
    (
      (rating >= (0)::numeric)
      and (rating <= (5)::numeric)
    )
  )
) TABLESPACE pg_default;

create table public.cart_items_test (
  cart_item_id bigserial not null,
  user_id text not null,
  product_id integer null,
  quantity integer null default 1,
  added_at timestamp without time zone null default now(),
  constraint cart_items_test_pkey primary key (cart_item_id),
  constraint cart_items_test_product_id_fkey foreign KEY (product_id) references products (product_id) on delete CASCADE
) TABLESPACE pg_default;

create table public.shipping_address (
  address_id uuid not null default gen_random_uuid (),
  order_id uuid null,
  first_name text null,
  last_name text null,
  email text null,
  phone text null,
  street text null,
  apartment text null,
  city text null,
  state text null,
  postal_code text null,
  created_at timestamp without time zone null default now(),
  constraint shipping_address_pkey primary key (address_id),
  constraint shipping_address_order_id_fkey foreign KEY (order_id) references orders (order_id) on delete CASCADE
) TABLESPACE pg_default;


create table public.users_test (
  id uuid not null,
  name text null,
  role text null default 'customer'::text,
  created_at timestamp without time zone null default now(),
  constraint users_test_pkey primary key (id),
  constraint users_test_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
```

## Deployment

### Backend (Railway/Render)

```bash
cd backend
npm run build
```

### Frontend (Vercel)
```bash
cd frontend
npm run build
```

## Documentation

- API.md - Complete API reference
- DEPLOYMENT.md - Deployment guide
- CONTRIBUTING.md - Development guidelines

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## License

MIT

---

Built with ❤️ using NestJS + React
