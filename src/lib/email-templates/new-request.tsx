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

export interface NewRequestEmailProps {
  vendorName?: string
  buyerName?: string
  productSummary?: string
  requestUrl?: string
  whatsappUrl?: string
}

export const NewRequestEmail = ({
  vendorName = 'Vendedor',
  productSummary = 'un producto',
  requestUrl,
  whatsappUrl,
}: NewRequestEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Te consultan por {productSummary}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>TE CONSULTAN POR:</Heading>
        <Text style={producto}>{productSummary}</Text>
        <Text style={text}>
          Hola {vendorName}, un cliente está buscando esto y tu comercio es una
          de las opciones para cotizarlo.
        </Text>
        {requestUrl && (
          <Button style={button} href={requestUrl}>
            Si podés cotizarlo, hacé click acá
          </Button>
        )}
        {requestUrl && (
          <Text style={small}>
            Ahí vas a ver el pedido completo y las fotos que mandó el cliente.
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
          Cuanto antes respondas, más chances tenés de cerrar la venta. No te
          olvidés de negociar.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default NewRequestEmail

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
