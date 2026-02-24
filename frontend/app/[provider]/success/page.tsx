"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function ProviderSuccess({ params }: { params: { provider: string } }) {
  const searchParams = useSearchParams()
  const entries = Array.from(searchParams.entries())
  const [isSubscription, setIsSubscription] = useState(false)
  const [mandateToken, setMandateToken] = useState<string | null>(null)

  useEffect(() => {
    // Check if this is a PayU subscription (SI) success
    const status = searchParams.get('status')
    const si = searchParams.get('si')
    const mihpayid = searchParams.get('mihpayid')
    
    if (params.provider === 'payu' && status === 'success' && si === '1') {
      setIsSubscription(true)
      // The mandate token might be in the response
      setMandateToken(mihpayid || searchParams.get('mandate_token'))
    }
    
    // Check if this is a Razorpay subscription success
    const razorpaySubscriptionId = searchParams.get('razorpay_subscription_id')
    const razorpayPaymentId = searchParams.get('razorpay_payment_id')
    
    if (params.provider === 'razorpay' && razorpaySubscriptionId) {
      setIsSubscription(true)
      setMandateToken(razorpaySubscriptionId)
    }
  }, [searchParams, params.provider])

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
        <h1 className="text-2xl font-semibold">
          {params.provider} {isSubscription ? 'Subscription' : 'Payment'} Success
        </h1>
      </div>
      
      {isSubscription && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-sm font-semibold text-green-800 mb-2">Subscription Activated!</h2>
          <p className="text-sm text-green-700">
            {params.provider === 'razorpay' 
              ? 'Your recurring payment has been successfully authorized with Razorpay.'
              : 'Your recurring payment mandate has been successfully registered with PayU.'
            }
            {mandateToken && (
              <span className="block mt-2">
                <strong>{params.provider === 'razorpay' ? 'Subscription ID' : 'Mandate Token'}:</strong>{' '}
                <code className="text-xs bg-white px-2 py-1 rounded">{mandateToken}</code>
              </span>
            )}
          </p>
        </div>
      )}
      
      <p className="mb-4 text-sm text-gray-600">The provider returned the following information:</p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No parameters were provided.</p>
      ) : (
        <dl className="bg-white rounded-md shadow-sm divide-y divide-gray-100 mb-6">
          {entries.map(([k, v]) => (
            <div key={k} className="px-4 py-3 flex justify-between">
              <dt className="text-sm font-medium text-gray-700">{k}</dt>
              <dd className="text-sm text-gray-600 ml-4 break-words max-w-md text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/subscriptions">View Subscriptions</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Return to Dashboard</Link>
        </Button>
      </div>
      
      <p className="mt-8 text-xs text-gray-500">
        Note: For production use, you should verify this transaction on your server using {
          params.provider === 'razorpay' ? "Razorpay's" : 
          params.provider === 'cashfree' ? "Cashfree's" :
          params.provider === 'payu' ? "PayU's" : "the provider's"
        } webhook or verification APIs.
      </p>
    </div>
  )
}
