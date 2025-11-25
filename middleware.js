export const config = {
  matcher: '/:path*',
};

export default async function middleware(request) {
  const basicAuth = request.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    try {
      const [user, pwd] = atob(authValue).split(':');

      const validUser = process.env.BASIC_AUTH_USER || 'inner';
      const validPassword = process.env.BASIC_AUTH_PASSWORD || 'log2025';

      if (user === validUser && pwd === validPassword) {
        return;
      }
    } catch (e) {
      // Invalid base64
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Inner Log - Test Environment"',
    },
  });
}
