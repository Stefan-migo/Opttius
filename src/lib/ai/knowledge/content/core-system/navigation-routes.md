# Navegación y Rutas del Sistema Opttius

## Overview

Este documento lista las rutas válidas del panel de administración. Usar SOLO estas rutas al sugerir navegación o generar action_url en insights.

## Rutas Principales

### Dashboard y Vista General

- `/admin` - Dashboard principal, KPIs, visión general

### Trabajos y Presupuestos

- `/admin/work-orders` - Lista de trabajos de laboratorio
- `/admin/work-orders?status=ordered` - Trabajos ordenados
- `/admin/work-orders?status=sent_to_lab` - Trabajos enviados al laboratorio
- `/admin/quotes` - Presupuestos
- `/admin/quotes?status=draft` - Presupuestos en borrador
- `/admin/quotes?status=sent` - Presupuestos enviados

### Productos e Inventario

- `/admin/products` - Catálogo e inventario
- `/admin/products?filter=low_stock` - Productos con stock bajo
- `/admin/products/add` - Agregar producto
- `/admin/products/bulk` - Importación masiva
- `/admin/categories` - Categorías

### Clientes

- `/admin/customers` - Lista de clientes
- `/admin/customers/new` - Nuevo cliente

### Citas

- `/admin/appointments` - Citas y agenda
- `/admin/appointments/settings` - Configuración de citas

### Punto de Venta

- `/admin/pos` - Punto de venta
- `/admin/pos/settings` - Configuración POS
- `/admin/cash-register` - Caja registradora

### Analíticas

- `/admin/analytics` - Reportes y estadísticas

### Configuración

- `/admin/system` - Configuración del sistema (NO usar /admin/settings)
- `/admin/system/billing-settings` - Facturación
- `/admin/system/pos-billing-settings` - Facturación POS
- `/admin/branches` - Sucursales

### Otros

- `/admin/support` - Soporte e incidentes
- `/admin/support/tickets/new` - Nuevo ticket
- `/admin/admin-users` - Usuarios administradores
- `/admin/notifications` - Notificaciones
- `/admin/chat` - Chat IA

## Rutas que NO existen

- `/admin/settings` - No existe, usar `/admin/system`
- `/admin/products?lowStock=true` - Incorrecto, usar `/admin/products?filter=low_stock`
