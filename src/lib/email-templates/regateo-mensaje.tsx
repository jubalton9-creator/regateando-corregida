import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

export interface RegateoMensajeEmailProps {
  vendorName?: string
  buyerName?: string
  productSummary?: string
  requestUrl?: string
  whatsappUrl?: string
}

export const RegateoMensajeEmail = ({
  vendorName = 'Vendedor',
  buyerName = 'Un cliente',
  productSummary = 'un producto',
  requestUrl,
  whatsappUrl,
}: RegateoMensajeEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Te hicieron una oferta en el regateo</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>TE HICIERON UNA OFERTA</Heading>
        <Text style={producto}>{productSummary}</Text>
        <Text style={text}>
          Hola {vendorName}, {buyerName} está regateando el pedido y te mandó una oferta.
        </Text>
        {requestUrl && (
          <Button style={button} href={requestUrl}>
            Ver el regateo y responder
          </Button>
        )}
        {requestUrl && (
          <Text style={small}>
            Ahí ves la oferta del cliente y podés contestar con tu precio (o cerrar el trato).
          </Text>
        )}
        {whatsappUrl && (
          <>
            <Text style={text}>
              Si preferís, también podés responder directamente por WhatsApp:
            </Text>
            <Button style={{ ...button, backgroundColor: '#25D366' }} href={whatsappUrl}>
              Responder por WhatsApp
            </Button>
          </>
        )}
        <Text style={footer}>
          El regateo del cliente corre contra reloj: cuanto antes respondas, más chances tenés de cerrar la venta.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RegateoMensajeEmail

const purple = '#7C3AED'
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px' }
const h1 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#111111',
  letterSpacing: '0.5px',
  margin: '0 0 8px',
}
const producto = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: purple,
  lineHeight: '1.4',
  margin: '0 0 20px',
}
const small = { fontSize: '13px', color: '#6B7280', margin: '12px 0 24px' }
const text = {
  fontSize: '15px',
  color: '#4B5563',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: purple,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '14px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '32px 0 0' }
