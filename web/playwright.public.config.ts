if(process.env.CI)throw new Error('Public live journeys are not permitted in CI.');
import {defineConfig} from '@playwright/test';
const baseURL=process.env.SHELFREADY_PUBLIC_ORIGIN;
const username=process.env.DEMO_USER;
const password=process.env.DEMO_PASSWORD;
if (!baseURL || new URL(baseURL).protocol!=='https:' || !username || !password) {
 throw new Error('Configure HTTPS SHELFREADY_PUBLIC_ORIGIN and private DEMO_USER/DEMO_PASSWORD');
}
// No local API, worker or local runner: this journey must exercise deployed services.
export default defineConfig({testDir:'e2e',testMatch:'public.spec.ts',workers:1,retries:0,
 timeout:240000,reporter:'line',outputDir:'../artifacts/cloud/playwright',
 use:{baseURL,httpCredentials:{username,password},ignoreHTTPSErrors:false,
      trace:'off',video:'off',screenshot:'off'}});
