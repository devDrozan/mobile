import process from 'node:process';

// EAS supplies the selected environment before this lifecycle hook runs.
if (process.env.EAS_BUILD_PROFILE === 'production') {
  let valid = false;
  try {
    const url = new URL(process.env.EXPO_PUBLIC_API_BASE_URL ?? '');
    valid = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/';
  } catch { /* Show a configuration error without printing the environment value. */ }
  if (!valid) {
    console.error('Production build blocked: set EXPO_PUBLIC_API_BASE_URL to the verified HTTPS API origin in the Expo production environment.');
    process.exit(1);
  }
  console.log('Production API origin configured. Verify deployed calculations before uploading this build.');
}
