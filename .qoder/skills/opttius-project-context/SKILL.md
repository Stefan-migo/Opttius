---
name: opttius-project-context
description: Provides comprehensive context about the Opttius optical management system project including current status, architecture, active development areas, payment gateways, and team activities. Use when working with the Opttius codebase, asking about project status, SaaS implementation, payment systems, or needing context about the optical business software.
---

# Opttius Project Context Provider

## Project Overview

Opttius is a **complete optical management system** built with Next.js 14, TypeScript, and Supabase. It provides SaaS functionality for optical stores and laboratories with multi-tenancy architecture.

**Current Status:** 🟢 75% Complete - Production Ready Foundation (v2.2 - 2026-02-08)

## Core Architecture

### Tech Stack

- **Frontend:** Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Functions)
- **AI:** Multi-provider support (OpenAI, Anthropic, Google, DeepSeek)
- **Payments:** 4 gateways integrated (Mercado Pago, NOWPayments, Flow, PayPal)
- **Deployment:** Docker/Podman local development, Vercel production

### Key Components

- Multi-tenant SaaS architecture with organizations and branches
- Complete optical workflow: appointments → quotes → work orders → POS
- Advanced payment processing with cryptocurrency support
- AI-powered insights and chatbot assistant
- Real-time notifications and analytics

## Current Development Status

### ✅ Completed (Production Ready)

- Multi-tenancy with Row Level Security ✅
- Subscription management system ✅
- Administrative dashboard ✅
- Backup systems ✅
- Security framework (Phase 1: 100% complete) ✅
- Payment processing core ✅

### ⚠️ In Progress

- **Security Enhancement Phase 2:** Advanced monitoring (8/20 tests passing)
- **Payment Gateway Testing:** Flow and PayPal integration validation
- **Documentation Consolidation:** Streamlining SaaS documentation

### 📊 Payment Gateway Status

- **Mercado Pago:** ✅ Fully implemented and tested (Latin America)
- **NOWPayments:** ✅ Fully implemented and tested (Cryptocurrency)
- **Flow:** ⚠️ Core functionality implemented, needs comprehensive testing (Chilean market)
- **PayPal:** ⚠️ Core functionality implemented, needs comprehensive testing (Global)

## Project Structure Context

When working with specific areas, here's what you need to know:

### Database Schema

- Located in `supabase/migrations/`
- Key tables: organizations, branches, admin_users, customers, products, orders
- Multi-tenant isolation through RLS policies

### AI Integration

- AI tools located in `src/lib/ai/tools/`
- Current tools: products, customers, orders, analytics, support
- Agent core in `src/lib/ai/agent/core.ts`

### Payment Systems

- Payment gateways in `src/lib/payments/gateways/`
- Webhook handling in `src/app/api/webhooks/`
- Configuration in environment variables

## Active Development Areas

### Current Focus

1. **Payment Gateway Integration Testing** - Validating Flow and PayPal implementations
2. **Security Phase 2 Implementation** - Advanced monitoring and alerting
3. **Performance Optimization** - Preparing for scale

### Recent Achievements

- ✅ NOWPayments cryptocurrency integration completed
- ✅ Advanced testing framework implementation
- ✅ Documentation consolidation completed
- ✅ Phase 1 security implementation (100% test pass rate)

## Quick Reference Commands

### Development

```bash
npm run dev              # Start development server
npm run supabase:start   # Start local Supabase
npm run supabase:status  # Check Supabase status
npm run supabase:reset   # Reset database
```

### Testing

```bash
npm test                 # Run all tests
npm run test:coverage    # Test coverage report
```

## When to Use This Context

This skill should be automatically invoked when:

- Working with Opttius codebase files
- Asking about project status or architecture
- Needing payment gateway information
- Discussing SaaS implementation details
- Planning new features or modifications
- Debugging multi-tenant or payment-related issues

## Additional Resources

- **Main Documentation:** `README.md`
- **SaaS Status:** `docs/SAAS_IMPLEMENTATION_CURRENT_STATE.md`
- **Payment Gateways:** `docs/PAYMENT_GATEWAYS_IMPLEMENTATION_GUIDE.md`
- **Database Schema:** `supabase/migrations/`
- **Usage Examples:** [usage-examples.md](usage-examples.md)
