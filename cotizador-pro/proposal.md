# Proposal: Implementar Sistema de Suscripciones Manuales con Firebase Auth y Firestore

## Intent

Migrar el sistema de autenticación actual (hardcoded en Electron IPC) a Firebase Authentication y agregar un sistema de suscripciones manuales para controlar el acceso a la aplicación de carpintería (despiece de tableros MDF).

El cambio aborda:
- **Problema actual**: Autenticación cerrada sin gestión de usuarios ni control de acceso
- **Necesidad**: Sistema escalable que permita controlar el acceso basado en estado de suscripción
- **Restricción**: Sin gateway de pago externo (Stripe, MercadoPago) para reducir costos y complejidad

## Scope

### In Scope
- Migrar AuthContext de Electron IPC a Firebase Auth
- Agregar colección `users` en Firestore con campos: `subscription_status`, `subscription_plan`, `trial_end`, `subscription_end`
- Crear componente `SubscriptionExpired` para mostrar pantalla de suscripción vencida
- Modificar `ProtectedRoute` para verificar estado de suscripción además de autenticación
- Implementar lógica de bloqueo total al expirar trial (no funciones limitadas)
- UI con información de contacto para pago manual (WhatsApp/transferencia bancaria)
- Activación manual desde Firebase Console (sin servidor extra ni panel admin)

### Out of Scope
- Integración con pasarelas de pago automáticas
- Panel de administración para usuarios
- Sistema de notificaciones automáticas por vencimiento
- Soporte para múltiples planes (solo trial + suscripción única)
- Migración de datos históricos de usuarios
- Backend personalizado para gestión de suscripciones

## Capabilities

### New Capabilities
- `user-auth-firebase`: Autenticación y gestión de usuarios mediante Firebase Auth
- `subscription-management`: Sistema de suscripciones manuales con estado en Firestore
- `access-control`: Verificación de acceso basada en estado de suscripción
- `ui-subscription-expired`: Componente para mostrar estado de suscripción vencida

### Modified Capabilities
- `auth-context`: Cambio de implementación de Electron IPC a Firebase Auth
- `protected-routes`: Adición de verificación de suscripción al flujo de autenticación

## Approach

### Arquitectura
1. **Autenticación**: Reemplazar sistema actual con Firebase Auth (email/password y Google Sign-In)
2. **Base de datos**: Usar Firestore para almacenar estado de suscripción en colección `users`
3. **Lógica de acceso**: 
   - Al login: Verificar `subscription_end` vs fecha actual
   - Si expirado: Redirigir a pantalla de suscripción vencida
   - Si activo: Permitir acceso completo
4. **Activación manual**: Desde Firebase Console Console → Authentication → Users → Editar usuario → Agregar datos de suscripción manualmente

### Flujo de trabajo
```
Usuario → Login (Firebase Auth) → Verificar suscripción (Firestore) → 
  Si activo: Acceso completo
  Si expirado: Mostrar UI SubscriptionExpired con:
    - Fecha de vencimiento
    - Instrucciones de pago (WhatsApp/transferencia)
    - Botón "Ya pagué" para activación manual
```

### Tecnologías
- Firebase Authentication (gratis en tier Spark)
- Firestore Database (gratis en tier Spark)
- React + Vite + Electron (sin cambios en stack principal)
- TypeScript (tipado para nuevos campos)

### Implementación incremental
1. Configurar Firebase project y habilitar Auth + Firestore
2. Instalar SDK de Firebase en el proyecto
3. Migrar AuthContext a Firebase Auth
4. Agregar lógica de suscripción en ProtectedRoute
5. Crear componente SubscriptionExpired
6. Probar flujo completo con usuarios de prueba

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/contexts/AuthContext.tsx` | Modificado | Reemplazar lógica de Electron IPC por Firebase Auth |
| `src/routes/ProtectedRoute.tsx` | Modificado | Agregar verificación de suscripción |
| `src/components/SubscriptionExpired.tsx` | Nuevo | Pantalla para usuarios con suscripción vencida |
| `src/types/subscription.ts` | Nuevo | Tipos TypeScript para estado de suscripción |
| `src/firebase/` | Nuevo | Configuración y utilidades de Firebase |
| `firestore.rules` | Nuevo | Reglas de seguridad de Firestore |
| `firebase.json` | Nuevo | Configuración de Firebase (opcional, si se usa CLI) |

## Riesgos

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Bloqueo accidental de usuarios** | High | Implementar lógica de verificación con logging detallado en desarrollo. Probar con usuarios de prueba antes de deploy |
| **Pérdida de autenticación durante migración** | Medium | Realizar backup de usuarios actuales antes de migrar. Implementar rollback rápido si falla |
| **Límites de Firebase Spark tier** | Low | Monitorear uso de Firestore y Auth. Planificar upgrade a Blaze tier si superamos límites gratuitos |
| **Usuarios no entienden proceso manual** | Medium | UI clara con instrucciones paso a paso y ejemplos de cómo pagar. Soporte inicial por WhatsApp |
| **Cambios en reglas de Firestore afectan seguridad** | Medium | Reglas de seguridad bien definidas y testeadas. Revisión por pares antes de deploy |

## Rollback Plan

1. **Identificar problema**: Monitorear logs y reportes de usuarios
2. **Activar rollback**: 
   - Revertir cambios en AuthContext a versión anterior
   - Restaurar backup de usuarios si necesario
   - Deshabilitar verificación de suscripción temporalmente
3. **Comunicar**: Notificar a usuarios afectados por WhatsApp/email
4. **Analizar causa raíz**: Revisar logs de Firebase y código
5. **Corregir y redeploy**: Implementar fix y volver a deployar

**Tiempo estimado de rollback**: <30 minutos (cambio de rama git + redeploy)

## Dependencies

- Cuenta de Google con acceso a Firebase Console
- Configuración inicial de proyecto Firebase (1 vez)
- Credenciales de Firebase para el proyecto (API keys)
- WhatsApp Business para soporte (opcional, pero recomendado)

## Success Criteria

- [ ] Autenticación funciona con Firebase Auth (login/logout/registro)
- [ ] Estado de suscripción se guarda correctamente en Firestore
- [ ] ProtectedRoute bloquea acceso cuando trial/suscripción expira
- [ ] Componente SubscriptionExpired muestra información correcta
- [ ] Instrucciones de pago son claras y accesibles
- [ ] Activación manual desde Firebase Console funciona
- [ ] Todos los tests pasan (si existen)
- [ ] Documentación actualizada para equipo de soporte
- [ ] Métricas básicas implementadas (usuarios activos, suscripciones activas)

---

**Nota**: Este sistema es intencionalmente simple para reducir complejidad y costos. El modelo de "pago manual" es adecuado para un negocio pequeño donde el contacto directo con el cliente es parte del servicio.