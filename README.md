# Squai — Fundamentos de Inteligencia Artificial Generativa

Landing page estática construida con [Astro](https://astro.build), a partir del
diseño `Landing Fundamentos de IA`. El markup, los estilos y los textos son una
reproducción fiel del artefacto original.

## Requisitos

- Node.js 18.20.8 o superior
- pnpm

## Comandos

| Comando          | Acción                                             |
| :--------------- | :------------------------------------------------- |
| `pnpm install`   | Instala las dependencias                            |
| `pnpm dev`       | Servidor de desarrollo en `localhost:4321`          |
| `pnpm build`     | Compila el sitio estático en `./dist/`              |
| `pnpm preview`   | Sirve localmente el resultado de `pnpm build`       |

## Estructura

```
public/
  fonts/            Outfit, Urbanist y Gloria Hallelujah (woff2, self-hosted)
  images/           Fotos del equipo (webp)
src/
  components/       Cada sección de la página + Logo y Badge
  data/landing.ts   Todos los textos y listas de la página
  layouts/          Layout base (head, meta, fuentes)
  pages/index.astro Composición de la página y scripts de interacción
  styles/global.css @font-face, tokens de diseño y estados hover/focus
```

Los textos viven en `src/data/landing.ts`; el resto de las copias están inline
en el componente de su sección.
