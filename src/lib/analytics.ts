// Analytics tracking utilities
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
  }
};

// Eventos críticos de conversão
export const CONVERSION_EVENTS = {
  DEMO_REQUEST: 'demo_request_submitted',
  WHATSAPP_CLICK: 'whatsapp_contact_initiated',
  PRICING_VIEW: 'pricing_section_viewed',
  FEATURE_CLICK: 'feature_card_clicked',
  LOGIN_ATTEMPT: 'login_button_clicked',
  HERO_CTA_CLICK: 'hero_cta_clicked',
  SECTION_VIEW: 'section_viewed',
};
