# AI Knowledge Base Index

This directory contains the structured documentation that powers the AI chat agent's domain expertise.

## Structure Overview

```
knowledge/
├── base/                    # Foundation components
│   ├── templates/          # Documentation templates
│   ├── parsers/           # Content processing utilities
│   └── indexers/          # Search and indexing systems
├── content/               # Actual documentation files
│   ├── core-system/       # Authentication, navigation, basics
│   ├── business-modules/  # Appointments, products, customers, orders
│   ├── admin-features/    # SaaS management, analytics, backups
│   ├── integrations/      # Payment gateways, third-party services
│   └── troubleshooting/   # Common issues, error codes, FAQs
├── embeddings/            # Vector representations for RAG
│   ├── generated/        # Cached document embeddings
│   └── models/          # Embedding model configurations
└── utils/                # Helper functions and utilities
```

## Documentation Standards

All content follows standardized templates located in `base/templates/`:
- **MODULE_TEMPLATE.md** - For comprehensive feature documentation
- **QUICK_START_TEMPLATE.md** - For beginner-friendly guides
- **TROUBLESHOOTING_TEMPLATE.md** - For problem-solving content

## Current Status

### Phase 1: Foundation (Complete ✅)
- [x] Directory structure created
- [x] Documentation templates established
- [ ] Content parsing utilities
- [ ] Indexing system implementation

### Phase 2: Essential Modules (In Progress 🚧)
- [ ] Authentication & User Management
- [ ] Appointment System
- [ ] Payment Gateways
- [ ] Product Management

## Contributing Guidelines

1. **Use Templates:** Always start with the appropriate template
2. **Business Language:** Write for optical store operators, not developers
3. **Specific Examples:** Include real-world scenarios and use cases
4. **Step-by-Step Instructions:** Number all procedural steps clearly
5. **Regular Updates:** Review and update documentation monthly

## Integration Points

The knowledge base integrates with:
- **AI Agent Core** (`src/lib/ai/agent/core.ts`)
- **Embedding System** (`src/lib/ai/embeddings/`)
- **Memory Management** (`src/lib/ai/memory/`)

## Maintenance Schedule

- **Weekly:** Review new support tickets for documentation needs
- **Monthly:** Update existing documentation based on user feedback
- **Quarterly:** Audit completeness and accuracy of all documentation