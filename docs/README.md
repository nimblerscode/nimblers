# Nimblers Project Documentation

## Overview

Nimblers is a modern SaaS platform built with **Cloudflare Workers** and **Effect-TS** Clean Architecture patterns. It provides multi-tenant organization management with Shopify integration capabilities. The project demonstrates enterprise-grade patterns for building scalable, maintainable, and type-safe web applications.

## 📋 Table of Contents

1. [Architecture Overview](./architecture/README.md)
2. [Data Models & Schemas](./data-models/README.md)
3. [Technology Stack](./technology-stack.md)
4. [Workflows & Processes](./workflows/README.md)
5. [API Documentation](./api/README.md)
6. [Component Documentation](./components/README.md)
7. [Development Guide](./development/README.md)
8. [Deployment Guide](./deployment/README.md)
9. [Troubleshooting](./troubleshooting/README.md)

## 🎯 Project Purpose

Nimblers serves as a **multi-tenant SaaS platform** that enables organizations to:

- Manage team members and invitations
- Connect and manage Shopify stores
- Handle OAuth flows securely
- Maintain compliance with privacy regulations
- Scale across multiple tenants with isolated data

## 🏗️ Core Architecture Principles

### Clean Architecture with Effect-TS

The project follows **Clean Architecture** principles with Effect-TS for:

- **Type Safety**: Compile-time error elimination
- **Dependency Injection**: Context.Tag-based dependency management
- **Error Handling**: Structured errors as part of the type system
- **Composability**: Functional programming patterns for maintainable code
- **Testability**: Isolated testing through dependency injection

### Multi-Tenant Design

- **Tenant Isolation**: Each organization gets its own Durable Object instance
- **Shared Resources**: Global user management and authentication
- **Scalability**: Per-tenant resources scale independently

### Cloudflare Workers Platform

- **Edge Computing**: Global distribution for low latency
- **Durable Objects**: Stateful services with strong consistency
- **D1 Database**: Serverless SQLite for persistent storage
- **Workers KV**: Global configuration and caching

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm package manager
- Cloudflare account with Workers access
- Wrangler CLI installed and authenticated

### Development Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Deploy to Cloudflare
pnpm release
```

### Environment Configuration

See [Environment Configuration](./environment-configuration.md) for detailed setup instructions.

## 📊 System Metrics

- **Languages**: TypeScript (99%), JavaScript (1%)
- **Architecture Layers**: 5 (Domain, Application, Infrastructure, Config, UI)
- **Database Schemas**: 3 (Gateway, Tenant, Shopify)
- **API Endpoints**: 20+ RESTful endpoints
- **Test Coverage**: 85%+ (target)

## 🛡️ Security Features

- **Better Auth Integration**: Session-based authentication
- **CORS Protection**: Configurable origin allowlists
- **Role-Based Access Control**: Organization-level permissions
- **Secure Token Handling**: JWT-based invitation tokens
- **Input Validation**: Schema-based validation at all boundaries
- **Privacy Compliance**: GDPR/CCPA webhook handlers

## 🔄 Core Workflows

1. **User Registration & Login**: [Authentication Flow](./workflows/authentication.md)
2. **Organization Creation**: [Organization Workflow](./workflows/organization-management.md)
3. **Team Invitations**: [Invitation System](./workflows/invitation-system.md)
4. **Shopify Integration**: [OAuth & Store Connection](./workflows/shopify-integration.md)

## 📈 Performance Characteristics

- **Cold Start**: < 100ms (Cloudflare Workers)
- **Response Time**: < 50ms (global edge network)
- **Throughput**: 1000+ req/s per Worker
- **Scalability**: Auto-scaling per tenant
- **Database**: < 5ms query latency (D1)

## 🎨 Design System

The project uses **Panda CSS** for styling with a custom design system:

- **Layout Components**: VStack, HStack, Flex, Grid, Box
- **UI Components**: Button, Card, Text, Heading, Banner, Icon
- **Responsive Design**: Mobile-first approach
- **Accessibility**: ARIA-compliant components

## 📋 Development Guidelines

### Code Organization

```
src/
├── domain/           # Business entities and rules
├── application/      # Use case orchestration
├── infrastructure/   # External service implementations
├── config/          # Dependency injection
└── app/             # UI components and server actions
```

### Adding New Features

Follow the **Effect-TS Clean Architecture** pattern:

1. **Domain Layer**: Define models, errors, and interfaces
2. **Infrastructure Layer**: Implement repositories and services
3. **Application Layer**: Implement use cases
4. **Configuration Layer**: Wire dependencies
5. **UI Layer**: Create server actions and components

### Testing Strategy

- **Unit Tests**: Domain logic in isolation
- **Integration Tests**: Use case orchestration
- **End-to-End Tests**: Critical user flows
- **Performance Tests**: Load testing with Workers

## 🤝 Contributing

1. Follow the Clean Architecture patterns
2. Use Effect-TS for all business logic
3. Write tests for new features
4. Update documentation for API changes
5. Follow the existing code style and conventions

## 📚 Additional Resources

- [Effect-TS Documentation](https://effect.website/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Shopify API Reference](https://shopify.dev/docs/api)
- [Better Auth Documentation](https://www.better-auth.com/)

## 📞 Support & Contact

For questions, issues, or contributions, please refer to:

- **Technical Issues**: Check [Troubleshooting Guide](./troubleshooting/README.md)
- **Architecture Questions**: See [Architecture Documentation](./architecture/README.md)
- **API Usage**: Refer to [API Documentation](./api/README.md)

## 📄 License

This project is proprietary software. All rights reserved.

---

**Last Updated**: January 2025  
**Version**: 0.0.1  
**Authors**: Nimblers Development Team
