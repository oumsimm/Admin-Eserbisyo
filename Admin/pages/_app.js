import React from 'react';
import '../styles/globals.css';
import { AuthProvider } from '../hooks/useAuth';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';

function Guard({ children }) {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  if (loading) return null;
  const publicRoutes = ['/login', '/bootstrap-admin'];
  if (publicRoutes.includes(router.pathname)) return children;
  if (!user) {
    router.replace('/login');
    return null;
  }
  // Temporarily disabled admin check for development
  // if (!isAdmin) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="bg-white p-6 rounded shadow text-center">
  //         <div className="text-lg font-semibold text-red-600">Access denied</div>
  //         <div className="text-gray-600 mt-2">This area is restricted to administrators.</div>
  //       </div>
  //     </div>
  //   );
  // }
  return children;
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Guard>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </Guard>
    </AuthProvider>
  );
}
