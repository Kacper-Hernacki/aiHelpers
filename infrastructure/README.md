# 🏗️ Infrastructure

This directory contains all infrastructure-related files for the AI Helpers project.

## 📁 **Directory Structure**

```
infrastructure/
├── database/           # Database schemas and migrations
├── docker/            # Docker Compose files
├── scripts/           # Setup and utility scripts
└── README.md          # This file
```

## 🗄️ **Database** (`/database/`)

### `safe_migration.sql`
- **Purpose**: PostgreSQL schema migration for pgvector support
- **Features**: Adds `document_embeddings` table with vector(1536) column
- **Safety**: Uses `IF NOT EXISTS` to prevent data loss
- **Usage**: Run directly in PostgreSQL or via migration tool

```bash
psql -d your_database -f infrastructure/database/safe_migration.sql
```

## 🐳 **Docker** (`/docker/`)

### `docker-compose.neo4j.yml`
- **Purpose**: Neo4j graph database container setup
- **Features**: Neo4j 5.13 Community with APOC plugin
- **Ports**: 7474 (HTTP), 7687 (Bolt)
- **Configuration**: Memory optimized for development

```bash
docker-compose -f infrastructure/docker/docker-compose.neo4j.yml up -d
```

## 🔧 **Scripts** (`/scripts/`)

### `setup-neo4j.sh`
- **Purpose**: Automated Neo4j + pgvector setup
- **Features**: 
  - Starts Neo4j Docker container
  - Configures environment variables
  - Tests connectivity
  - Production-ready setup

```bash
# Run from project root
chmod +x infrastructure/scripts/setup-neo4j.sh
./infrastructure/scripts/setup-neo4j.sh
```

## 🚀 **Quick Start**

1. **Database Setup**: Run the migration script
2. **Neo4j Setup**: Execute the setup script
3. **Verify**: Check containers and connectivity

## 📞 **Notes**

- All scripts should be run from the project root directory
- Ensure Docker is running before executing setup scripts
- Environment variables are automatically configured by setup scripts
