import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: 'http://127.0.0.1:4321',
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'npm run dev -- --host 127.0.0.1',
		url: 'http://127.0.0.1:4321',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
	projects: [
		{
			name: 'Mobile Chrome',
			use: {
				...devices['Pixel 7'],
				defaultBrowserType: 'chromium',
			},
		},
		{
			name: 'Mobile Safari',
			use: {
				...devices['iPhone 15'],
				defaultBrowserType: 'webkit',
			},
		},
		{
			name: 'WeChat WebView approximation',
			use: {
				...devices['Pixel 7'],
				defaultBrowserType: 'chromium',
				userAgent:
					'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP1A.240405.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.50',
			},
		},
	],
});
