// Tailwind needs full class names to be present in source, so every variant is spelled out.
export const CATEGORIES = {
  frontend: { label: 'Frontend', dot: 'bg-cat-frontend', text: 'text-cat-frontend', border: 'border-cat-frontend/60' },
  backend: { label: 'Backend', dot: 'bg-cat-backend', text: 'text-cat-backend', border: 'border-cat-backend/60' },
  config: { label: 'Config', dot: 'bg-cat-config', text: 'text-cat-config', border: 'border-cat-config/60' },
  tests: { label: 'Tests', dot: 'bg-cat-tests', text: 'text-cat-tests', border: 'border-cat-tests/60' },
  docs: { label: 'Docs', dot: 'bg-cat-docs', text: 'text-cat-docs', border: 'border-cat-docs/60' },
  other: { label: 'Other', dot: 'bg-cat-other', text: 'text-cat-other', border: 'border-cat-other/60' },
}

export const categoryOf = (key) => CATEGORIES[key] ?? CATEGORIES.other
