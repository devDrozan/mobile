import { Platform } from 'react-native';
import createClient from 'openapi-fetch';
import type { paths } from './schema';

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? (__DEV__ ? (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://127.0.0.1:3001') : '');
function hasUsableApiUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'https:' || (__DEV__ && protocol === 'http:');
  }
  catch { return false; }
}
export const api = createClient<paths>({
  baseUrl,
  fetch: async request => {
    try { return await fetch(request, { signal: request.signal, cache: 'no-store', credentials: 'omit' }); }
    catch { throw new ApiFailure([], 'offline'); }
  },
});
export type ContextInput = paths['/v1/calculations/context']['post']['requestBody']['content']['application/json'];
export type Context = paths['/v1/calculations/context']['post']['responses'][200]['content']['application/json'];
export type CalculationInput = paths['/v1/calculations']['post']['requestBody']['content']['application/json'];
export type Calculation = paths['/v1/calculations']['post']['responses'][200]['content']['application/json'];
export type ApiFailureKind = 'offline' | 'unavailable' | 'invalid' | 'server';
export class ApiFailure extends Error {
  constructor(public issues: { field: string; code: string }[] = [], public kind: ApiFailureKind = issues.length ? 'invalid' : 'unavailable') { super('API_REQUEST_FAILED'); }
}
// Include reading/parsing the response in the deadline. A fetch promise can
// resolve at headers while its response body is still waiting on the network.
export async function withApiDeadline<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  // Validate before openapi-fetch constructs a Request, so a missing/malformed
  // origin is consistently reported as configuration rather than a server fault.
  if (!hasUsableApiUrl(baseUrl)) throw new ApiFailure([], 'unavailable');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ApiFailure([], 'offline'));
    }, 15000);
  });
  try { return await Promise.race([operation(controller.signal), deadline]); }
  catch (error) {
    if (error instanceof ApiFailure) throw error;
    throw new ApiFailure([], 'server');
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
// A reachable API that rejects the request is a service fault, not a missing
// address; keep the two apart so clients can explain the right cause.
function httpFailure(error?: { issues?: { field: string; code: string }[] }) {
  const issues = error?.issues ?? [];
  return new ApiFailure(issues, issues.length ? 'invalid' : 'server');
}
export async function getContext(body: ContextInput) {
  const { data, error } = await withApiDeadline(signal => api.POST('/v1/calculations/context', { body, signal }));
  if (error || !data) throw httpFailure(error);
  return data;
}
export async function calculate(body: CalculationInput) {
  const { data, error } = await withApiDeadline(signal => api.POST('/v1/calculations', { body, signal }));
  if (error || !data) throw httpFailure(error);
  return data;
}

export async function estimateSalary(body: paths['/v1/salary-estimates']['post']['requestBody']['content']['application/json']) {
  const { data, error } = await withApiDeadline(signal => api.POST('/v1/salary-estimates', { body, signal }));
  if (error || !data) throw httpFailure(error);
  return data;
}
