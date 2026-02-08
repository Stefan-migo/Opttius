# Opttius Project Detailed Reference

## Architecture Deep Dive

### Multi-Tenant Data Model

The system uses a hierarchical multi-tenant structure:

```
ORGANIZATIONS (top level)
├── SUBSCRIPTIONS (billing)
├── BRANCHES (operational units)
│   ├── CUSTOMERS (per branch)
│   ├── PRODUCTS (per branch)
│   └── ORDERS (per branch)
└── ADMIN_USERS (organization access)
```

### Key Database Tables

**Core Entities:**

- `organizations` - Tenant isolation boundary
- `branches` - Operational units within organizations
- `admin_users` - Administrative access control
- `customers` - Client management (branch-scoped)
- `products` - Optical products catalog (branch-scoped)
- `orders` - Sales transactions (branch-scoped)

**Workflow Tables:**

- `appointments` - Scheduling system
- `quotes` - Price proposals
- `lab_work_orders` - Laboratory processing
- `prescriptions` - Medical prescriptions

**System Tables:**

- `subscriptions` - Billing and tier management
- `payments` - Payment processing records
- `webhook_events` - Payment gateway integration

### Row Level Security (RLS) Implementation

All tenant data is isolated through RLS policies that automatically scope queries to the user's organization. This ensures data privacy and security at the database level.

## Payment Gateway Integration Details

### Implementation Status Matrix

| Gateway      | Status              | Testing           | Region        | Notes                |
| ------------ | ------------------- | ----------------- | ------------- | -------------------- |
| Mercado Pago | ✅ Production Ready | ✅ Sandbox & Live | Latin America | Complete integration |
| NOWPayments  | ✅ Production Ready | ✅ Sandbox & Live | Global        | Crypto payments      |
| Flow         | ⚠️ Beta             | ⚠️ Core only      | Chile         | Needs full testing   |
| PayPal       | ⚠️ Beta             | ⚠️ Core only      | Global        | Needs full testing   |

### Gateway Configuration

Environment variables required:

```env
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=your_token
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=your_key

# NOWPayments
NOWPAYMENTS_API_KEY=your_key
NOWPAYMENTS_IPN_SECRET=your_secret

# Flow
FLOW_API_KEY=your_key
FLOW_SECRET_KEY=your_secret

# PayPal
PAYPAL_CLIENT_ID=your_id
PAYPAL_CLIENT_SECRET=your_secret
```

## AI Agent Integration Points

### Current AI Tools Available

1. **Product Management** (`src/lib/ai/tools/products.ts`)
   - Get products with filtering
   - Create/update products
   - Inventory management

2. **Customer Operations** (`src/lib/ai/tools/customers.ts`)
   - Customer lookup and management
   - Appointment scheduling
   - Prescription handling

3. **Order Processing** (`src/lib/ai/tools/orders.ts`)
   - Order creation and management
   - Payment status updates
   - Fulfillment tracking

4. **Analytics** (`src/lib/ai/tools/analytics.ts`)
   - Business metrics
   - Performance reporting
   - Trend analysis

### Adding New AI Tools

To create new tools, follow the pattern in existing tool files:

1. Define Zod schema for parameters
2. Implement ToolDefinition with execute function
3. Export from `src/lib/ai/tools/index.ts`
4. Add to agent tool registry

## Development Workflow

### Typical Development Cycle

1. **Feature Planning**
   - Review `SAAS_IMPLEMENTATION_CURRENT_STATE.md`
   - Check current priorities and blockers
   - Assess impact on multi-tenant architecture

2. **Implementation**
   - Follow existing code patterns
   - Maintain RLS compliance
   - Add appropriate tests

3. **Testing**
   - Unit tests for business logic
   - Integration tests for API endpoints
   - Manual testing in development environment

4. **Deployment**
   - Apply database migrations
   - Update environment variables
   - Monitor system health

### Common Development Tasks

**Adding a New Feature:**

- Create migration file in `supabase/migrations/`
- Update RLS policies if needed
- Add API endpoints in `src/app/api/`
- Create frontend components in `src/app/admin/`
- Add tests in `__tests__/`

**Modifying Existing Functionality:**

- Check impact on multi-tenancy
- Review existing RLS policies
- Update tests accordingly
- Consider backward compatibility

## Troubleshooting Common Issues

### Database Connection Issues

```bash
# Check Supabase status
npm run supabase:status

# Reset database if needed
npm run supabase:reset
```

### Payment Gateway Problems

- Verify environment variables are set
- Check webhook URL configuration
- Review gateway documentation for region-specific requirements

### Multi-Tenant Access Issues

- Verify user organization assignment
- Check RLS policy effectiveness
- Review admin user permissions

## Performance Considerations

### Database Optimization

- Use indexes on frequently queried columns
- Implement pagination for large datasets
- Monitor query performance with Supabase logs

### Frontend Performance

- Implement code splitting for admin pages
- Use React Query for data caching
- Optimize image loading and assets

### Scalability Planning

- Monitor connection pool usage
- Plan for geographic distribution
- Consider read replicas for analytics

## File Structure Navigation

### Key Directories

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes
│   └── [...]/             # Public pages
├── components/            # React components
│   ├── admin/             # Admin-specific components
│   └── ui/                # Reusable UI components
├── lib/                   # Business logic
│   ├── ai/                # AI agent and tools
│   ├── payments/          # Payment processing
│   └── utils/             # Utility functions
supabase/
├── migrations/            # Database schema changes
└── config.toml            # Supabase configuration
docs/                      # Project documentation
.qoder/skills/             # IDE skills (including this one)
```

### Important Configuration Files

- `.env.local` - Local environment variables
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Project dependencies and scripts

## Testing Strategy

### Test Types

1. **Unit Tests** - Component and function testing
2. **Integration Tests** - API endpoint testing
3. **End-to-End Tests** - User workflow testing
4. **Security Tests** - RLS and authentication testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test files
npm test -- testNamePattern="specific test"
```

## Deployment Considerations

### Environment Setup

**Development:**

- Local Supabase via Docker/Podman
- Environment variables in `.env.local`
- Hot reloading enabled

**Production:**

- Supabase cloud project
- Vercel deployment
- Environment variables in Vercel dashboard

### Monitoring and Logging

- Supabase logs for database queries
- Vercel logs for application errors
- Custom logging in `src/lib/utils/logger.ts`
- Performance monitoring via Next.js analytics

## Security Best Practices

### Authentication

- Supabase Auth for user management
- JWT token validation
- Role-based access control

### Data Protection

- Row Level Security policies
- Encrypted environment variables
- Secure API endpoint design

### Input Validation

- Zod schema validation
- Server-side validation
- Sanitization of user inputs
