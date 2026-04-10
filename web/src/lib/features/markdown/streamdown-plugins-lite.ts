// Keep Streamdown's plugin surface available through a repo-local module so
// Vite/Vitest can intercept internal `./plugins.js` imports consistently.
export * from 'streamdown-svelte/dist/plugins.js'
