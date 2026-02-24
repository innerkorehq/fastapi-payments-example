"use client"

import React, { use } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ProviderCancel({ params }: { params: Promise<{ provider: string }> }) {
  // `params` is a Promise in client components - unwrap it with React.use()
  const resolvedParams = use(params)
  const provider = resolvedParams?.provider

  const searchParams = useSearchParams()
  const entries = Array.from(searchParams.entries())

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-semibold mb-4">{provider} payment cancelled</h1>
      <p className="mb-4 text-sm text-gray-600">The provider returned the following query params:</p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No details were provided.</p>
      ) : (
        <dl className="bg-white rounded-md shadow-sm divide-y divide-gray-100">
          {entries.map(([k, v]) => (
            <div key={k} className="px-4 py-3 flex justify-between">
              <dt className="text-sm font-medium text-gray-700">{k}</dt>
              <dd className="text-sm text-gray-600 ml-4 break-words">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-6 text-sm text-gray-700">You can close this window and return to the application.</p>
    </div>
  )
}
