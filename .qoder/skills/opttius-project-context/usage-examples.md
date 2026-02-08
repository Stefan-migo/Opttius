# Opttius Project Context Skill - Usage Examples

## How the Skill Works

This skill automatically provides context when you work with Opttius project files. The IDE's AI assistant will recognize when you're in the Opttius project directory and provide relevant information without you having to ask.

## Example Scenarios

### Scenario 1: Opening a Payment-Related File

**When you open:** `src/lib/payments/gateways/mercadoPago.ts`

**AI Assistant automatically provides:**

> "I see you're working on Mercado Pago integration. Currently this gateway is fully implemented and tested. The other payment gateways (NOWPayments, Flow, PayPal) are also integrated but Flow and PayPal need additional testing. The payment gateway factory pattern is in this directory, and webhook handling is in `src/app/api/webhooks/`."

### Scenario 2: Working on Database Schema

**When you open:** `supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql`

**AI Assistant provides:**

> "You're working on the multi-tenant schema. The key tables are organizations, branches, and subscriptions. RLS policies ensure tenant isolation. The current implementation supports 3 subscription tiers (basic, pro, premium) with feature flags for each."

### Scenario 3: Modifying AI Tools

**When you open:** `src/lib/ai/tools/products.ts`

**AI Assistant suggests:**

> "This is the products AI tool. Other available tools include customers, orders, analytics, and support. When adding new functionality, follow the existing Zod schema pattern and remember to export from the main index.ts file."

## Direct Questions You Can Ask

### Project Status Questions

- "What's the current status of the Opttius project?"
- "Which payment gateways are fully implemented?"
- "What are the current development priorities?"

### Technical Questions

- "How does the multi-tenant architecture work?"
- "Where are the RLS policies defined?"
- "What's the structure for adding new AI tools?"

### Workflow Questions

- "How do I add a new database migration?"
- "What's the testing strategy for this project?"
- "How do I configure a new payment gateway?"

## Best Practices

### When to Expect Context

The skill automatically activates when:

- Working in any file within the Opttius project directory
- Referencing project-specific terms (organizations, branches, payments, etc.)
- Asking about SaaS implementation details
- Discussing optical business workflows

### Getting the Most Out of the Skill

1. **Work within the project directory** - The skill recognizes file paths
2. **Use project-specific terminology** - Mention "organizations", "branches", "payment gateways"
3. **Ask follow-up questions** - The skill maintains conversation context
4. **Reference specific files** - Mention exact file paths for targeted help

### Troubleshooting

If the skill doesn't seem to be activating:

1. Ensure you're working within the Opttius project directory
2. Check that the `.qoder/skills/opttius-project-context/` directory exists
3. Restart your IDE to refresh skill detection
4. Try explicitly mentioning "Opttius project" in your questions

## Skill Capabilities

### What It Knows

- Current project status and completion percentage
- Multi-tenant architecture details
- Payment gateway implementation status
- Active development focus areas
- Tech stack and dependencies
- File structure and key directories
- Development workflows and commands

### What It Helps With

- Understanding project context quickly
- Navigating complex architecture
- Identifying current development priorities
- Providing relevant technical information
- Suggesting appropriate code patterns
- Offering troubleshooting guidance

## Integration with Development Workflow

### Daily Development

- Automatically provides context when switching between files
- Helps understand the impact of changes on multi-tenant architecture
- Suggests relevant testing approaches
- Provides quick access to documentation

### Code Reviews

- Explains architectural decisions
- Highlights multi-tenancy considerations
- Suggests appropriate validation approaches
- Provides context for payment gateway changes

### Onboarding New Developers

- Provides comprehensive project overview
- Explains key architectural concepts
- Shows current development focus areas
- Offers guidance on contribution workflow
