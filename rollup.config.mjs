import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

import packageJson from "./package.json" with { type: "json" };

const external = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
  "react-dom",
  "react/jsx-runtime",
];
const isExternal = (id) =>
  external.some((dep) => id === dep || id.startsWith(`${dep}/`));

export default [
  {
    input: "src/index.ts",
    external: isExternal,
    output: [
      { file: packageJson.main, format: "cjs", sourcemap: true },
      { file: packageJson.module, format: "esm", sourcemap: true },
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        sourceMap: true,
      }),
    ],
  },
  {
    input: "src/index.ts",
    external: isExternal,
    output: [{ file: packageJson.types, format: "esm" }],
    plugins: [dts()],
  },
];
