# ForgeFit Web

Migración de la app SwiftUI a una aplicación web responsive, PWA y multiusuario.

## Incluye

- Next.js + TypeScript.
- Supabase Auth y PostgreSQL con RLS.
- Rutinas iniciales de Pecho, Espalda y Pierna.
- Cuatro series automáticas: 12, 10, 8 y 6.
- Selección completa al enfocar campos numéricos.
- Checks por serie y ejercicio completado automáticamente.
- Detección y animación de récord de peso.
- Historial, calendario por grupo muscular y racha semanal.
- Biblioteca con buscador, notas y 1RM estimado.
- Gráficas de progreso.
- Registro de cintura, pecho, brazo relajado/flexionado, muslo y cadera.
- Exportación `.xlsx` completa.
- PWA instalable desde el navegador.

## Puesta en marcha

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor**, pega `supabase/schema.sql` y ejecútalo.
3. En Supabase, abre **Project Settings → API** y copia la URL y la clave pública/publishable.
4. Copia `.env.example` como `.env.local` y rellena:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Instala y ejecuta:

```bash
npm install
npm run dev
```

6. Abre `http://localhost:3000`, crea una cuenta y entra. Las rutinas iniciales se crean automáticamente.

## Desplegar en Vercel

1. Sube el proyecto a GitHub, o ejecuta `npx vercel` dentro de la carpeta.
2. Añade en Vercel las dos variables de `.env.local`.
3. Despliega.

## Importar datos del iPhone

El ZIP del proyecto Swift contiene el código, no la base de datos SwiftData del dispositivo. Para conservar los entrenamientos ya registrados hay que añadir a la app iOS una exportación JSON o recuperar su contenedor de datos mediante Xcode. Esta versión web ya deja preparado el modelo equivalente para importar esos datos después.

## Diferencia respecto al widget de iOS

Una web no puede distribuir un WidgetKit nativo. ForgeFit Web sí es instalable como PWA y ofrece un panel “Hoy”, pero un widget real del iPhone necesitaría mantener la extensión Swift y conectarla a la API de Supabase.
