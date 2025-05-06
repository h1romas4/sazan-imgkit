# sazan-wasm

## Build

```bash
wasm-pack build --target bundler --out-dir ../../examples/web/vender/sazan-wasm
rm examples/web/vender/sazan-wasm/.gitignore
```

```bash
cd examples/web
(cd ../../components/sazan-wasm/ && wasm-pack build --target bundler --out-dir ../../examples/web/vender/sazan-wasm)
npm run dev
```
