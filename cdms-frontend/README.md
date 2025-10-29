
# CDMS Frontend Setup (React + Vite)

## Quickstart (Windows PowerShell)

1. **Install dependencies**

	Open a terminal in this folder and run:
	```pwsh
	npm install
	```

2. **If you see errors about missing dependencies (e.g. lucide-react):**

	Install the missing package:
	```pwsh
	npm install lucide-react
	```
	(Repeat for any other missing packages reported by Vite)

3. **Clear Vite cache if you see persistent dependency errors:**

	```pwsh
	Remove-Item -Recurse -Force .vite, .vite-temp, .\node_modules\.vite, .\node_modules\.vite-temp
	```

4. **Start the development server**

	```pwsh
	npm run dev
	```
	The app will be available at [http://localhost:5173/](http://localhost:5173/)

---

## About This Template

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
