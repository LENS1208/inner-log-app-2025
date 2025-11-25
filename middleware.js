export const config = {
  matcher: '/:path*',
};

export default async function middleware(request) {
  const basicAuth = request.headers.get('authorization');
  const url = request.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    try {
      const [user, pwd] = atob(authValue).split(':');

      const validUser = process.env.BASIC_AUTH_USER || 'admin';
      const validPassword = process.env.BASIC_AUTH_PASSWORD || 'innerlog2025';

      if (user === validUser && pwd === validPassword) {
        return Response.next();
      }
    } catch (e) {
      // Invalid base64
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Inner Log - Please enter credentials"',
    },
  });
}
