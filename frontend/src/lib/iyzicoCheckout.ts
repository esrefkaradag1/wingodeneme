export const IYZICO_CONTAINER_ID = 'iyzico-form-container';

/** iyzico bundle'ının formu inline basmak için aradığı hedef elemanın id'si */
const IYZICO_FORM_TARGET_ID = 'iyzipay-checkout-form';

const INJECTED_SCRIPT_ATTR = 'data-iyzico-injected';

/**
 * checkoutFormContent'i modal içine basar ve script'leri çalıştırır.
 * iyzico bundle'ı `#iyzipay-checkout-form` elemanını arar; sınıfı `responsive`
 * ise formu inline basar, aksi halde (bulamazsa) body'ye yüzen "Ödeme Formunu Aç"
 * butonuyla popup moduna düşer. Bu yüzden hedef div'i responsive olarak garanti ederiz.
 */
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

  // Hedef formu inline (responsive) moda zorla — yoksa oluştur.
  let hedef = wrapper.querySelector<HTMLElement>(`#${IYZICO_FORM_TARGET_ID}`);
  if (!hedef) {
    hedef = document.createElement('div');
    hedef.id = IYZICO_FORM_TARGET_ID;
    wrapper.insertBefore(hedef, wrapper.firstChild);
  }
  hedef.classList.remove('popup');
  hedef.classList.add('responsive');

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
  // iyzico bundle'ı popup modunda body'ye yüzen buton/overlay bırakabiliyor; onları da temizle.
  document
    .querySelectorAll(
      `body > #${IYZICO_FORM_TARGET_ID}, body > [id^="iyzipay"], body > .iyzico-overlay, body > [class*="iyzipay"]`
    )
    .forEach((el) => el.remove());
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
