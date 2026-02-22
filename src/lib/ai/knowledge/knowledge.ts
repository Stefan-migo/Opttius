export const EXPERT_KNOWLEDGE = {
  lens_families: `
## EXPERTO EN FAMILIAS DE LENTES Y MATRICES
El sistema de lentes en Opttius se organiza jerárquicamente:

1. **Familia de Lentes (Nivel Superior)**
   - Representa el producto comercial (ej: "Varilux Comfort", "Blue Block CR39").
   - Contiene atributos generales: Marca, Tipo (Monofocal, Bifocal, Progresivo), Material (CR39, Policarbonato, Alto Índice).

2. **Matrices de Precios (Nivel Detalle)**
   - Una familia puede tener MULTIPLES matrices.
   - Cada matriz define un rango específico de dioptrías (Esfera, Cilindro, Adición) y su precio.
   - **Regla de Validación**: Una familia NO puede existir sin al menos una matriz de precios.
   
### Flujo de Creación (Wizard)
Para crear una nueva familia, el usuario debe ir a "Catálogo > Lentes > Nuevo" y seguir estos pasos:
1. **Paso 1: Información General**: Completar nombre, marca, material y tipo.
2. **Paso 2: Configuración de Matrices**: Agregar al menos una matriz definiendo:
   - Rangos (ej: Esfera -6.00 a +6.00).
   - Precios (Venta y Costo).
   - Sourcing (Stock vs Laboratorio/Surfaced).
Los botones "Siguiente" y "Crear Familia" guían el proceso. No se permite guardar si no hay matrices definidas.
`,

  email_configuration: `
## EXPERTO EN CONFIGURACIÓN DE EMAIL
Para que los correos (recibos, notificaciones, etc.) salgan a nombre de la óptica del usuario y no como "no-reply@opttius.cl", el sistema utiliza **Resend**.

### Requisitos para Dominio Propio
1. El usuario debe poseer un dominio propio (ej: \`mioptica.com\`).
2. Se debe configurar autenticación DNS (registros DKIM, SPF, DMARC).
3. **Limitación Actual**: El agente NO puede configurar esto automáticamente. Requiere intervención de soporte técnico o acceso al panel de control de DNS del usuario.

### Alternativas Inmediatas
- **Reply-To**: Si el usuario no tiene dominio verificado, los correos saldrán de \`no-reply@opttius.cl\`, pero se configuran para que si el cliente responde, el correo llegue al email de la óptica.
- **Nombre de Remitente**: Aunque el email sea genérico, el "Nombre" del remitente se personaliza con el nombre de la Organización (ej: "Óptica Visión Clara <no-reply@opttius.cl>").

### Guía para el Usuario
Si el usuario pregunta "cómo enviar correos desde mi mail", explícale:
1. Por defecto, usamos un servicio seguro para garantizar la entrega.
2. Aparece el nombre de su óptica, pero la dirección técnica es del sistema.
3. Para usar su propio dominio (\`info@mioptica.com\`), necesita una configuración técnica avanzada de DNS. Sugiere contactar a soporte si desea activar esta función "Marca Blanca".
`,
};
