import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this resource.
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              <p className="mb-4">This could be because:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>You don't have access to this restaurant</li>
                <li>Your account has been deactivated</li>
                <li>You're trying to access a resource that doesn't exist</li>
                <li>Your session has expired</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/select-restaurant">
                  Select Different Restaurant
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/signin">
                  Sign In Again
                </Link>
              </Button>
              
              <Button asChild variant="ghost" className="w-full">
                <Link href="/">
                  Go Home
                </Link>
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Need help? <Link href="/contact" className="text-blue-600 hover:text-blue-500">Contact Support</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}