// Analytics tracking utilities
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
  }
  
  // Facebook Pixel se disponível
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('trackCustom', eventName, eventParams);
  }
};

// Eventos críticos de conversão
export const CONVERSION_EVENTS = {
  // Macro Conversões
  DEMO_REQUEST: 'demo_request_submitted',
  WHATSAPP_INITIATED: 'whatsapp_contact_initiated',
  FORM_STARTED: 'contact_form_started',
  FORM_COMPLETED: 'contact_form_completed',
  
  // Micro Conversões
  HERO_CTA_CLICK: 'hero_cta_clicked',
  FEATURE_CLICK: 'feature_card_clicked',
  PRICING_VIEW: 'pricing_section_viewed',
  FAQ_OPENED: 'faq_item_opened',
  
  // Engagement
  SCROLL_50: 'scrolled_50_percent',
  SCROLL_75: 'scrolled_75_percent',
  SCROLL_100: 'scrolled_to_bottom',
  TIME_ON_PAGE_30S: 'spent_30_seconds',
  TIME_ON_PAGE_60S: 'spent_60_seconds',
  
  // Exit Intent
  EXIT_INTENT_SHOWN: 'exit_intent_popup_shown',
  EXIT_INTENT_CONVERTED: 'exit_intent_offer_accepted',
  
  // WhatsApp
  WHATSAPP_CLICK: 'whatsapp_contact_initiated',
  WHATSAPP_HERO: 'whatsapp_hero_clicked',
  WHATSAPP_INLINE: 'whatsapp_inline_clicked',
  WHATSAPP_FLOAT: 'whatsapp_float_clicked',
  
  // Legacy
  LOGIN_ATTEMPT: 'login_button_clicked',
  SECTION_VIEW: 'section_viewed',
};
