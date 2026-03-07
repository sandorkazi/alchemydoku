# Alchemydoku

Alchemists board game puzzle trainer.

## Development

```bash
npm install
npm run dev
```

> **Important:** Because `base` is set to `/alchemydoku/` (required for GitHub Pages),
> open the dev server at **http://localhost:5173/alchemydoku/** — not the root URL.
> All images will 404 if you access `localhost:5173/` directly.

## Build & Deploy (GitHub Pages)

```bash
npm run build        # outputs to dist/
# push dist/ to the gh-pages branch, or use the GitHub Actions workflow
```

## Ingredient order (sprite index = ID − 1)

| ID | Name           | File   |
|----|----------------|--------|
| 1  | Fern           | i0.png |
| 2  | Bird Claw      | i1.png |
| 3  | Mushroom       | i2.png |
| 4  | Flower         | i3.png |
| 5  | Mandrake       | i4.png |
| 6  | Scorpion       | i5.png |
| 7  | Toad           | i6.png |
| 8  | Raven's Feather| i7.png |
