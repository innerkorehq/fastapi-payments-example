/**
 * Razorpay Checkout JS helper.
 *
 * Lazily loads https://checkout.razorpay.com/v1/checkout.js and exposes a
 * single `openRazorpayCheckout()` function that opens the payment modal.
 *
 * Usage
 * -----
 *   import { openRazorpayCheckout } from '@/lib/razorpay-checkout';
 *
 *   // After backend returns checkout_config from create_subscription /
 *   // process_payment:
 *   await openRazorpayCheckout(
 *     checkoutConfig,            // the dict from backend
 *     (response) => { ... },    // success: razorpay_payment_id / signature present
 *     (error)    => { ... },    // dismissed or payment failed
 *   );
 */

declare global {
  interface Window {
    // Razorpay constructor injected by the external script
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, handler: (response: unknown) => void): void;
    };
  }
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptLoadPromise: Promise<boolean> | null = null;

/** Idempotently loads the Razorpay Checkout JS script. */
function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`,
    );

    const script = existing ?? document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptLoadPromise = null; // allow retry
      resolve(false);
    };

    if (!existing) {
      document.head.appendChild(script);
    } else if (window.Razorpay) {
      // Script tag exists but may have already loaded
      resolve(true);
    }
  });

  return scriptLoadPromise;
}

// ------------------------------------------------------------------
// Public types
// ------------------------------------------------------------------

/** The payload Razorpay Checkout JS passes to the `handler` callback. */
export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  /** Present for one-time order checkouts */
  razorpay_order_id?: string;
  /** Present for subscription checkouts */
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

/** Minimal shape of the checkout_config dict returned by the backend. */
export type RazorpayCheckoutConfig = Record<string, unknown>;

// ------------------------------------------------------------------
// Main export
// ------------------------------------------------------------------

/**
 * Opens the Razorpay Checkout modal.
 *
 * @param checkoutConfig  The `checkout_config` dict from the backend response.
 *   Must include at minimum `key` and either `order_id` or `subscription_id`.
 * @param onSuccess       Called with the Razorpay response when payment succeeds.
 *   **Important**: you must verify the signature on your backend before
 *   considering the payment successful.
 * @param onError         Called when the modal is dismissed or payment fails.
 */
export async function openRazorpayCheckout(
  checkoutConfig: RazorpayCheckoutConfig,
  onSuccess: (response: RazorpayPaymentResponse) => void,
  onError?: (reason: string) => void,
): Promise<void> {
  const loaded = await loadRazorpayScript();

  if (!loaded || !window.Razorpay) {
    onError?.('Failed to load Razorpay checkout. Please check your internet connection.');
    return;
  }

  const options: Record<string, unknown> = {
    ...checkoutConfig,

    // Override (or add) the handler – this is called on payment success
    handler(response: RazorpayPaymentResponse) {
      onSuccess(response);
    },

    modal: {
      // Preserve any modal options the backend may have set
      ...(typeof checkoutConfig.modal === 'object' && checkoutConfig.modal !== null
        ? (checkoutConfig.modal as Record<string, unknown>)
        : {}),
      ondismiss() {
        onError?.('Payment cancelled.');
      },
    },
  };

  const rzp = new window.Razorpay(options);

  rzp.on('payment.failed', (response: unknown) => {
    const err = response as { error?: { description?: string } };
    onError?.(err?.error?.description ?? 'Payment failed.');
  });

  rzp.open();
}
