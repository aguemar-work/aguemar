import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 ya exporta configuración plana: no hace falta el adaptador FlatCompat.
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // Aviso del compilador de React sobre `watch()` de react-hook-form. No usamos el compilador de React:
    // sin esta línea salen 10 avisos que no se pueden accionar.
    rules: { "react-hooks/incompatible-library": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-verify/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
