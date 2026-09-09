import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Code généré par `prisma generate`, jamais édité à la main.
    ignores: ['src/generated/**'],
  },
];

export default eslintConfig;
