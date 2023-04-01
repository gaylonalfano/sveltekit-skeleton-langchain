import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
  // optimizeDeps: {
  //   include: ['langchain'],
  // },
  // build: {
  //   commonjsOptions: {
  //     include: [/node_modules/],
  //   },
  // },
});
