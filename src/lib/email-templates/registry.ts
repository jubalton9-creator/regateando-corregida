import type { ComponentType } from 'react'
import { NewRequestEmail } from './new-request'
import type { NewRequestEmailProps } from './new-request'
import { RegateoMensajeEmail } from './regateo-mensaje'
import type { RegateoMensajeEmailProps } from './regateo-mensaje'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'new-request': {
    component: NewRequestEmail,
    displayName: 'Nuevo pedido para vendedor',
    subject: (data) => `Te consultan por ${data['productSummary'] ?? 'un producto'}`,
    previewData: {
      vendorName: 'Casa D Rentis',
      buyerName: 'Un cliente',
      productSummary: 'clavos sin cabeza de 2 pulgadas',
      requestUrl: 'https://regateando.online/cotizar',
      whatsappUrl:
        'https://wa.me/5491132289094?text=Hola%20Casa%20D%20Rentis%2C%20te%20consultan%20por%20clavos%20sin%20cabeza%20de%202%20pulgadas.',
    } satisfies NewRequestEmailProps,
  },
  'regateo-mensaje': {
    component: RegateoMensajeEmail,
    displayName: 'Oferta en el regateo (vendedor)',
    subject: (data) => `Te hicieron una oferta por ${data['productSummary'] ?? 'tu pedido'}`,
    previewData: {
      vendorName: 'Casa D Rentis',
      buyerName: 'Un cliente',
      productSummary: 'clavos sin cabeza de 2 pulgadas',
      requestUrl: 'https://regateando.online/cotizar',
      whatsappUrl: 'https://wa.me/5491132289094',
    } satisfies RegateoMensajeEmailProps,
  },
}
