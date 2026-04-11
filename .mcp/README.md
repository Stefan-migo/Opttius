# 🔧 Configuración MCP Local para Opttius

Configuración local de Model Context Protocol (MCP) para integraciones con servicios externos en el proyecto Opttius.

## 🎯 Propósito

Este directorio contiene configuraciones MCP específicas del proyecto Opttius que se ejecutan **localmente** (no globalmente). Esto permite:

1. **Configuración por proyecto** - Cada proyecto tiene sus propias integraciones
2. **Variables de entorno específicas** - Credenciales por proyecto
3. **Portabilidad** - Fácil de compartir entre desarrolladores
4. **Version control** - Configuración en el repositorio

## 📁 Estructura

```
.mcp/
├── README.md                    # Esta documentación
├── notion/                      # Configuración de Notion MCP
│   ├── config.json             # Configuración del servidor
│   ├── start-server.js         # Script para iniciar servidor
│   └── package.json            # Dependencias específicas
├── supabase/                   # Configuración Supabase MCP
│   └── config.json
├── github/                     # Configuración GitHub MCP
│   └── config.json
└── claude-desktop-config.json  # Config principal para Claude Desktop
```

## 🚀 Uso Rápido

### 1. Instalar Dependencias

```bash
cd .mcp/notion
npm install
```

### 2. Configurar Variables de Entorno

```bash
# Crear archivo .env en .mcp/notion/
cp .env.example .env
# Editar .env con tus credenciales
```

### 3. Configurar Claude Desktop

Editar `claude_desktop_config.json` en tu sistema:

```json
{
  "mcpServers": {
    "opttius-notion": {
      "command": "node",
      "args": ["D:/proyect/Opttius-app/.mcp/notion/start-server.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## 🔌 Integraciones Disponibles

### Notion MCP

- **Script:** `.mcp/notion/start-server.js`
- **Variables:** `NOTION_API_KEY`, `NOTION_DATABASE_*`
- **Capacidades:** Read/Write databases, pages, blocks

### Supabase MCP

- **Script:** `.mcp/supabase/start-server.js`
- **Variables:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- **Capacidades:** Query database, execute functions

### GitHub MCP

- **Script:** `.mcp/github/start-server.js`
- **Variables:** `GITHUB_TOKEN`
- **Capacidades:** Manage issues, PRs, repos

## 🔒 Seguridad

### Variables de Entorno

**NUNCA** commitear credenciales en el repositorio:

```bash
# BUENO: En .env (en .gitignore)
NOTION_API_KEY=secret_xxx

# MALO: En código o config JSON
"env": { "NOTION_API_KEY": "secret_xxx" }
```

### Gitignore

El archivo `.mcp/.gitignore` debe incluir:

```
*.env
node_modules/
*.log
*.tmp
```

## 🧪 Testing

### Probar Servidor MCP

```bash
cd .mcp/notion
node start-server.js --test
```

### Verificar Configuración

```bash
# Verificar que Claude Desktop puede encontrar el servidor
node .mcp/test-connection.js
```

## 🔄 Workflow de Desarrollo

1. **Nueva Integración:**

   ```bash
   mkdir .mcp/new-service
   cd .mcp/new-service
   npm init -y
   # Agregar dependencias MCP
   # Crear start-server.js
   # Crear config.json
   ```

2. **Actualizar Configuración:**

   ```bash
   # Editar .mcp/claude-desktop-config.json
   # Agregar nueva entrada mcpServers
   ```

3. **Testing:**
   ```bash
   # Reiniciar Claude Desktop
   # Probar herramientas nuevas
   ```

## 🚨 Solución de Problemas

### Claude Desktop No Detecta Servidor

1. Verificar ruta en `claude_desktop_config.json`
2. Verificar que el script tiene permisos de ejecución
3. Verificar que el servidor se inicia correctamente
4. Revisar logs de Claude Desktop

### Errores de Conexión

1. Verificar variables de entorno
2. Verificar que las credenciales son válidas
3. Verificar rate limits de la API
4. Verificar permisos de la integración

### Performance

1. Los servidores MCP locales son más rápidos que globales
2. Cachear respuestas cuando sea posible
3. Usar conexiones persistentes
4. Monitorear uso de memoria

## 📚 Recursos

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Claude Desktop MCP Docs](https://docs.anthropic.com/claude/docs/model-context-protocol)
- [Notion MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/notion)
- [Supabase MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/supabase)

---

**Última actualización:** 2026-03-28  
**Estado:** 🚧 En configuración
