# BarberShop - Documentacion Tecnica

## Stack Tecnologico

| Capa | Tecnologia | Descripcion |
|------|-----------|-------------|
| Frontend | React 18 + TypeScript | Interfaz de usuario SPA |
| Bundler | Vite 7 | Servidor de desarrollo y build |
| Estilos | Tailwind CSS 3.4 | Utilidades CSS |
| Routing | React Router DOM 6 | Navegacion del lado del cliente |
| Iconos | Lucide React | Iconos SVG |
| Backend/DB | Supabase (PostgreSQL) | Base de datos, autenticacion, API REST |
| Pagos | Mercado Pago | Procesamiento de pagos online |
| Hosting | Vercel | Deploy + Serverless Functions |

**NO es Laravel, Django, ni ningun framework de PHP/Python.** El backend completo lo maneja Supabase (PostgreSQL + Auth + API REST automatica). No hay servidor backend propio.

---

## Estructura de Carpetas

```
barber-appointment-system/
├── api/                            # Vercel Serverless Functions (backend)
│   ├── create-barber.ts            # POST /api/create-barber
│   └── mercadopago/
│       ├── create-preference.ts    # POST /api/mercadopago/create-preference
│       └── webhook.ts              # POST /api/mercadopago/webhook
├── scripts/                        # Scripts SQL para Supabase
│   ├── 001_create_tables.sql       # Creacion de tablas
│   ├── 002_policies.sql            # Politicas RLS (Row Level Security)
│   ├── 003_trigger.sql             # Trigger para crear perfil automatico
│   └── 004_fix_trigger_and_policies.sql  # Fix de policies y trigger
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── BarberManagement.tsx    # CRUD de barberos (admin)
│   │   ├── client/
│   │   │   └── BookingForm.tsx         # Formulario de agendar cita (5 pasos)
│   │   ├── ui/                         # Componentes reutilizables
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Select.tsx
│   │   ├── LoadingScreen.tsx           # Pantalla de carga global
│   │   └── ProtectedRoute.tsx          # Guardia de rutas por rol
│   ├── contexts/
│   │   └── AuthContext.tsx             # Proveedor de autenticacion global
│   ├── lib/
│   │   ├── mercadopago.ts             # Utilidades de Mercado Pago (frontend)
│   │   ├── supabase.ts                # Cliente de Supabase (singleton)
│   │   └── utils.ts                   # Utilidad cn() para clases CSS
│   ├── pages/
│   │   ├── admin/
│   │   │   └── AdminDashboard.tsx      # Dashboard del administrador
│   │   ├── barber/
│   │   │   └── BarberDashboard.tsx     # Dashboard del barbero
│   │   ├── client/
│   │   │   └── ClientPortal.tsx        # Portal del cliente
│   │   └── LoginPage.tsx               # Pagina de login/registro
│   ├── types/
│   │   ├── database.ts                 # Tipos TypeScript de las tablas
│   │   └── index.ts                    # Barrel export
│   ├── App.tsx                         # Rutas principales
│   ├── index.css                       # Estilos globales + Tailwind
│   └── main.tsx                        # Entry point de React
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Base de Datos (Supabase/PostgreSQL)

### Diagrama de Tablas

```
auth.users (manejada por Supabase)
    │
    ▼ (trigger: handle_new_user)
profiles
    │ id (UUID, PK, FK -> auth.users.id)
    │ email (TEXT, UNIQUE)
    │ full_name (TEXT)
    │ phone (TEXT, nullable)
    │ role (TEXT: 'admin' | 'barber' | 'client')
    │ avatar_url (TEXT, nullable)
    │ created_at (TIMESTAMPTZ)
    │
    ├──────────────────┐
    ▼                  ▼
barbers            appointments
    │ id (UUID, PK)       │ id (UUID, PK)
    │ profile_id (FK)     │ client_id (FK -> profiles)
    │ is_active (BOOL)    │ barber_id (FK -> barbers)
    │ work_schedule (JSONB)│ service_id (FK -> services)
    │ created_at          │ appointment_date (DATE)
    │                     │ start_time (TIME)
    ▼                     │ end_time (TIME)
services                  │ status (TEXT)
    │ id (UUID, PK)       │ payment_status (TEXT)
    │ name (TEXT)          │ payment_method (TEXT, nullable)
    │ description (TEXT)   │ payment_id (TEXT, nullable)
    │ price (DECIMAL)      │ total_amount (DECIMAL)
    │ duration (INT, min)  │ notes (TEXT, nullable)
    │ is_active (BOOL)     │ created_at
    │ created_at           │
                           ▼
                      payments
                          │ id (UUID, PK)
                          │ appointment_id (FK -> appointments)
                          │ amount (DECIMAL)
                          │ payment_method (TEXT)
                          │ payment_provider (TEXT, nullable)
                          │ payment_provider_id (TEXT, nullable)
                          │ status (TEXT)
                          │ created_at
```

### Roles de Usuario

| Rol | Acceso | Ruta |
|-----|--------|------|
| `admin` | Dashboard admin, gestion de barberos y servicios, ver todas las citas | `/admin` |
| `barber` | Dashboard barbero, ver sus citas del dia, actualizar estado | `/barber` |
| `client` | Portal cliente, agendar citas, ver historial, pagar | `/portal` |

### Trigger: handle_new_user

Cuando un usuario se registra en Supabase Auth, este trigger crea automaticamente un registro en la tabla `profiles` con:
- `id` = el UUID del usuario en auth.users
- `email` = el email del usuario
- `full_name` = el metadata `full_name` o "Usuario" por defecto
- `role` = siempre `'client'` por defecto

Para cambiar el rol de un usuario a `admin` o `barber`, se debe hacer manualmente desde el Supabase Table Editor o via la API serverless `/api/create-barber`.

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado:

- **profiles**: Lectura publica para usuarios autenticados. Solo puedes editar tu propio perfil.
- **services**: Lectura publica. Solo admins pueden crear/editar/eliminar.
- **barbers**: Lectura publica. Solo admins pueden crear/editar/eliminar.
- **appointments**: Solo puedes ver tus propias citas (como cliente), las citas de tu barbero, o todas si eres admin.
- **payments**: Solo puedes ver pagos de tus citas o si eres admin/barbero asociado.

---

## Autenticacion

### Flujo de Login

```
1. Usuario ingresa email + password en LoginPage.tsx
2. Se llama supabase.auth.signInWithPassword()
3. Supabase valida credenciales y devuelve un session token
4. AuthContext.tsx detecta el evento SIGNED_IN via onAuthStateChange
5. Se hace fetch directo al REST API de Supabase para cargar el perfil
   (usando fetch() nativo, NO supabase.from(), para evitar AbortErrors)
6. El perfil se guarda en el estado global (React Context)
7. App.tsx lee profile.role y redirige:
   - admin  -> /admin
   - barber -> /barber
   - client -> /portal
```

### Flujo de Registro

```
1. Usuario llena formulario de registro en LoginPage.tsx
2. Se llama supabase.auth.signUp() con email, password y metadata
3. Supabase crea el usuario en auth.users
4. El trigger handle_new_user() crea automaticamente el perfil
   con role='client' en la tabla profiles
5. Se muestra mensaje: "Revisa tu correo para confirmar"
6. Usuario confirma email y puede hacer login
```

### AuthContext.tsx

Es el proveedor global de autenticacion. Expone:

```typescript
interface AuthContextType {
  user: User | null;       // Usuario de Supabase Auth (o null si no hay sesion)
  profile: Profile | null; // Perfil de la tabla profiles (con el rol)
  loading: boolean;        // true mientras se resuelve la sesion inicial
  signOut: () => void;     // Funcion para cerrar sesion
}
```

**Nota tecnica importante**: Para cargar el perfil se usa `fetch()` nativo al REST API de Supabase en lugar de `supabase.from('profiles')`. Esto es porque la libreria `@supabase/supabase-js v2` tiene un bug conocido donde las queries hechas dentro de `onAuthStateChange` se cancelan con un `AbortError` interno.

---

## Rutas (App.tsx)

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/login` | LoginPage | Publica (redirige si ya hay sesion) |
| `/admin/*` | AdminDashboard | Solo role='admin' |
| `/barber/*` | BarberDashboard | Solo role='barber' |
| `/portal/*` | ClientPortal | Solo role='client' |
| `/*` | Redirect | Redirige al dashboard segun rol |

### ProtectedRoute.tsx

Componente wrapper que protege rutas por rol:
1. Si `loading=true` -> muestra LoadingScreen
2. Si no hay `user` -> redirige a `/login`
3. Si el rol no esta en `allowedRoles` -> redirige al dashboard correcto
4. Si todo esta OK -> renderiza los children

---

## Paginas Principales

### LoginPage (`/login`)
- Formulario de login y registro en la misma pagina
- Toggle entre "Iniciar Sesion" y "Registrarse"
- Validaciones: email confirmado, credenciales incorrectas, errores de servidor
- Redireccion automatica si ya hay sesion activa

### AdminDashboard (`/admin`)
- Estadisticas: ganancias totales, citas del dia, pagos pendientes
- Lista de todas las citas con filtros
- Gestion de barberos (agregar, editar horario, suspender, eliminar)
- Gestion de servicios (en desarrollo)

### BarberDashboard (`/barber`)
- Estadisticas del dia: citas, completadas, ganancias
- Calendario para seleccionar fecha
- Lista de citas del dia seleccionado
- Acciones: confirmar, completar, cancelar citas
- Registrar pagos en efectivo

### ClientPortal (`/portal`)
- Saludo personalizado
- Boton "Agendar Cita" que abre el BookingForm
- Lista de proximas citas con estado y detalles
- Opciones: cancelar cita, pagar online (Mercado Pago)

---

## Componentes Clave

### BookingForm (5 pasos)

```
Paso 1: Seleccionar servicio (lista de servicios activos)
Paso 2: Seleccionar barbero (lista de barberos activos)
Paso 3: Seleccionar fecha (calendario interactivo)
Paso 4: Seleccionar hora (slots disponibles calculados por duracion)
Paso 5: Confirmar y agendar (resumen + boton de confirmacion)
```

El calculo de horarios disponibles considera:
- El horario de trabajo del barbero (`work_schedule` JSONB)
- La duracion del servicio seleccionado
- Las citas ya existentes para ese barbero en esa fecha

### BarberManagement

- CRUD completo de barberos
- Crear barbero via API serverless (`POST /api/create-barber`) para no perder la sesion del admin
- Editor visual de horario semanal por dia
- Toggle activar/suspender barbero

---

## API Serverless (Vercel Functions)

### POST /api/create-barber

Crea un nuevo usuario barbero usando la `SERVICE_ROLE_KEY` de Supabase (clave admin).

**Request body:**
```json
{
  "email": "barbero@ejemplo.com",
  "password": "minimo6chars",
  "fullName": "Juan Perez",
  "phone": "+52 123 456 7890",
  "workSchedule": { ... }
}
```

**Flujo interno:**
1. Crea usuario en auth.users con `admin.createUser()` (confirma email automaticamente)
2. Crea/actualiza perfil en `profiles` con `role='barber'`
3. Crea registro en `barbers` con horario

**Variables de entorno requeridas:**
- `SUPABASE_URL` o `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### POST /api/mercadopago/create-preference

Crea una preferencia de pago en Mercado Pago para que el cliente pague online.

**Variables de entorno requeridas:**
- `MERCADOPAGO_ACCESS_TOKEN`

### POST /api/mercadopago/webhook

Recibe notificaciones de pago de Mercado Pago y actualiza el estado de la cita.

**Variables de entorno requeridas:**
- `MERCADOPAGO_ACCESS_TOKEN`
- `SUPABASE_URL` (o `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Variables de Entorno

### Frontend (archivo `.env` en la raiz)

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-...
```

### Backend (configurar en Vercel Dashboard > Settings > Environment Variables)

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
```

**IMPORTANTE**: La `SERVICE_ROLE_KEY` NUNCA debe exponerse en el frontend. Solo se usa en las Vercel Functions (`api/`).

---

## Tipos TypeScript

Definidos en `src/types/database.ts`:

```typescript
type UserRole = 'admin' | 'barber' | 'client';

interface Profile {
  id: string; email: string; full_name: string;
  phone: string | null; role: UserRole;
  avatar_url: string | null; created_at: string;
}

interface Barber {
  id: string; profile_id: string; is_active: boolean;
  work_schedule: WorkSchedule; created_at: string;
  profile?: Profile;
}

interface Service {
  id: string; name: string; description: string | null;
  price: number; duration: number; is_active: boolean;
  created_at: string;
}

interface Appointment {
  id: string; client_id: string; barber_id: string;
  service_id: string; appointment_date: string;
  start_time: string; end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_method: 'cash' | 'online' | null;
  total_amount: number; notes: string | null;
  client?: Profile; barber?: Barber; service?: Service;
}
```

---

## Componentes UI Reutilizables

| Componente | Archivo | Descripcion |
|-----------|---------|-------------|
| `Button` | `ui/Button.tsx` | Variantes: primary, secondary, outline, ghost, danger. Soporta loading state. |
| `Card` | `ui/Card.tsx` | Contenedor con variantes: default, bordered, elevated. |
| `Input` | `ui/Input.tsx` | Campo de texto con label integrado. |
| `Select` | `ui/Select.tsx` | Selector dropdown con label. |
| `Badge` | `ui/Badge.tsx` | Etiqueta de estado: success, warning, danger, info. |
| `Modal` | `ui/Modal.tsx` | Dialogo modal con overlay, titulo y cierre. Tamanos: sm, md, lg. |

---

## Comandos

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Build de produccion
npm run build

# Preview del build
npm run preview
```

---

## Setup desde Cero

### 1. Crear proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com) y crear un proyecto
2. Copiar la URL y la Anon Key de Settings > API

### 2. Configurar base de datos
Ejecutar en orden en el SQL Editor de Supabase (Dashboard > SQL Editor > New Query):
1. `scripts/001_create_tables.sql` - Crea las tablas
2. `scripts/002_policies.sql` - Configura las politicas RLS
3. `scripts/003_trigger.sql` - Crea el trigger de perfiles automaticos
4. `scripts/004_fix_trigger_and_policies.sql` - Fix de policies (recomendado)

### 3. Configurar variables de entorno
Crear archivo `.env` en la raiz:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Crear usuario admin
1. Registrarse normalmente desde la app
2. Ir al Supabase Table Editor > profiles
3. Cambiar el campo `role` de `client` a `admin`

### 5. Crear barberos
Una vez logueado como admin, ir al dashboard y usar el boton "Agregar Barbero".
Esto requiere que la variable `SUPABASE_SERVICE_ROLE_KEY` este configurada en Vercel.

---

## Problemas Conocidos

### AbortError de supabase-js v2
La version `@supabase/supabase-js ^2.38.0` tiene un bug donde el `AbortController` interno cancela peticiones que se hacen dentro del callback de `onAuthStateChange`. La solucion implementada es usar `fetch()` nativo al REST API de Supabase para las queries criticas (como cargar el perfil del usuario).

### Error "Database error querying schema" (500)
Este error ocurre cuando el trigger `handle_new_user` falla. Solucion: ejecutar `scripts/004_fix_trigger_and_policies.sql` en el SQL Editor de Supabase.

---

## Paleta de Colores

| Token | Uso |
|-------|-----|
| `--background` | Fondo principal (slate-900) |
| `--foreground` | Texto principal (blanco) |
| `--primary` | Color principal (amber-500 / dorado) |
| `--muted` | Fondos secundarios (slate-700) |
| `--destructive` | Acciones peligrosas (rojo) |
| `--border` | Bordes (slate-600) |
