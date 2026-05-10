# Contributing to E-Commerce Platform

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account (test mode)

### Local Development

```bash
# Clone
git clone https://github.com/AliNaseem123456789/My-Ecommerce-Website.git
cd ecommerce-platform
```
# Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure your .env file
npm run start:dev
```
# Frontend (new terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

# Project Structure
```bash
backend/src/
├── auth/           # JWT authentication
├── products/       # Product CRUD
├── categories/     # Categories
├── cart/           # Shopping cart
├── wishlist/       # Wishlist
├── orders/         # Order management
├── payments/       # Stripe integration
├── reviews/        # Product reviews
├── questions/      # Q&A system
├── account/        # User addresses
└── supabase/       # Database client

frontend/src/
├── components/     # Reusable UI
├── pages/          # Page components
├── services/       # API calls
├── contexts/       # React contexts
├── styles/         # CSS modules
└── assets/         # Images, logos
```
# Coding Standards
## Backend (NestJS)
- Use decorators (@Controller, @Get, @Post)
- Implement DTOs for validation
- Use dependency injection
- Write unit tests with Jest


## Example
```bash
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }
}
```
# Frontend (React)
- Use functional components with hooks
- Implement error boundaries
- Use context for global state
- CSS Modules for styling

## Good example
```bash
const ProductCard = ({ product, onAddToCart }) => {
  const [loading, setLoading] = useState(false);
  
  const handleAdd = async () => {
    setLoading(true);
    await onAddToCart(product);
    setLoading(false);
  };
  
  return (
    <Card>
      <Typography>{product.name}</Typography>
      <Button onClick={handleAdd} disabled={loading}>
        Add to Cart
      </Button>
    </Card>
  );
};
```
# Commit Convention
```bash
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code formatting
refactor: Code restructuring
test: Add tests
chore: Maintenance tasks
```
# Pull Request Process
1. Create feature branch: `git checkout -b feature/description`
2. Commit changes following convention
3. Push and open PR
4. Ensure all tests pass
5. Request review from maintainers

# Testing
``` bash
# Backend tests
cd backend
npm test
npm run test:cov
```

# Frontend tests
```bash
cd frontend
npm test
npm run test:coverage
```
# Adding New Features
1. New API Endpoint
2. Create module: nest g module feature
3. Create controller: nest g controller feature
4. Create service: nest g service feature
5. Register in AppModule

# New Frontend Page
1. Create component in pages
2. Add route in App.jsx
3. Add navigation link
4. Create API service if needed

# Database Migrations
```bash
-- Always create migrations as SQL files
-- backend/migrations/001_create_products.sql
CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Rollback
-- DROP TABLE IF EXISTS products;
```
# Getting Help
- Open an issue for bugs
- Discuss features in Discussions
- Check existing PRs for similar work

# Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help others learn
- No harassment or toxic behavior

Thank you for contributing! 
