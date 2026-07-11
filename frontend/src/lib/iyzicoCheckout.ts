export const IYZICO_CONTAINER_ID = 'iyzico-form-container';

const INJECTED_SCRIPT_ATTR = 'data-iyzico-injected';

/** innerHTML ile eklenen script etiketlerini çalıştırır (iyzico checkout formu için gerekli). */
export function injectIyzicoCheckoutForm(
  html: string,
  containerId = IYZICO_CONTAINER_ID
): boolean {
  const container = document.getElementById(containerId);
  if (!container) return false;

  cleanupIyzicoCheckoutScripts();
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  container.appendChild(wrapper);

  const scripts = wrapper.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const source = scripts[i];
    const script = document.createElement('script');
    script.setAttribute(INJECTED_SCRIPT_ATTR, 'true');
    if (source.src) {
      script.src = source.src;
      if (source.type) script.type = source.type;
      if (source.async) script.async = true;
      if (source.defer) script.defer = true;
    } else {
      script.text = source.text || source.textContent || '';
    }
    document.body.appendChild(script);
  }

  return true;
}

export function cleanupIyzicoCheckoutScripts(): void {
  document.querySelectorAll(`script[${INJECTED_SCRIPT_ATTR}]`).forEach((el) => el.remove());
}

export type IyzicoCheckoutPayload = {
  checkoutFormContent?: string | null;
  paymentPageUrl?: string | null;
};

/** checkoutFormContent varsa modal açılır; yoksa paymentPageUrl'e yönlendirilir. */
export function iyzicoOdemeBaslat(
  payload: IyzicoCheckoutPayload,
  onModal: (checkoutForm: string) => void
): boolean {
  if (payload.checkoutFormContent) {
    onModal(payload.checkoutFormContent);
    return true;
  }
  if (payload.paymentPageUrl) {
    window.location.href = payload.paymentPageUrl;
    return true;
  }
  return false;
}
