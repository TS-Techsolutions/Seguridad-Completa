import type { CSSProperties, ReactNode } from 'react'
import type { BlockId, ColumnId, DesignConfig } from './ExpenseDesignPage'
import type { Context } from './types'
import { readCompanyIdentity } from './operation-date-rules'

export type ExpenseDocumentLine = Record<ColumnId, string> & { id: string }

export type ExpenseDocumentData = {
  receiptNumber: string
  documentType: string
  issueDate: string
  owner: string
  ownerId: string
  address: string
  phone: string
  email: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  amountInWords: string
  paymentMethod: string
  paymentTerm: string
  paymentUnit: string
  subtotal: string
  discount: string
  tax: string
  total: string
  lines: ExpenseDocumentLine[]
}

export function ExpenseDocument({ design, company, data, large = false, className = '' }: {
  design: DesignConfig
  company: Context['company']
  data: ExpenseDocumentData
  large?: boolean
  className?: string
}) {
  const enabledColumns = design.columns.filter(column => column.visible)
  const companyIdentity = readCompanyIdentity(company)
  const style = { '--expense-accent': design.accent, '--expense-font': design.fontFamily } as CSSProperties
  const blocks: Record<BlockId, ReactNode> = {
    company: <header className="expense-document-header">
      <div className="expense-document-company">
        {design.logo ? <img src={design.logo} alt="Logotipo" /> : <span>LOGO</span>}
        <div>
          {design.companyFields.businessName && <strong>{companyIdentity.businessName.toUpperCase()}</strong>}
          {design.companyFields.ruc && <small>R.U.C.: {companyIdentity.ruc || 'No registrado'}</small>}
          {design.companyFields.address && <small>{companyIdentity.address || 'Dirección no registrada'}</small>}
          {design.companyFields.phone && <small>Teléfono: {companyIdentity.phone || 'No registrado'}</small>}
          {design.companyFields.email && <small>Email: {companyIdentity.email || 'No registrado'}</small>}
        </div>
      </div>
      <div className="expense-document-number">
        <strong>{design.title || 'COMPROBANTE DE EXPENSAS'}</strong>
        <b>{data.receiptNumber}</b>
        <small>{data.documentType}</small>
      </div>
    </header>,
    customer: <section className="expense-document-customer">
      <div>
        <p><b>FECHA:</b><span>{data.issueDate}</span></p>
        {design.fields.owner && <p><b>CLIENTE:</b><span>{data.owner}</span></p>}
        {design.fields.address && <p><b>DIRECCIÓN:</b><span>{data.address}</span></p>}
      </div>
      <div>
        {design.fields.ownerId && <p className="expense-document-identification"><b>IDENTIFICACIÓN:</b><span>{data.ownerId}</span></p>}
        {design.fields.phone && <p><b>TELÉFONO:</b><span>{data.phone}</span></p>}
        {design.fields.email && <p><b>EMAIL:</b><span>{data.email}</span></p>}
      </div>
    </section>,
    detail: <section className="expense-document-detail"><table>
      <thead><tr>{enabledColumns.map(column => <th key={column.id}>{column.label}</th>)}</tr></thead>
      <tbody>{data.lines.map(line => <tr key={line.id}>{enabledColumns.map(column => <td key={column.id}>{line[column.id]}</td>)}</tr>)}</tbody>
    </table></section>,
    payment: <section className="expense-document-payment">
      <div>
        <p><b>SON:</b> {data.amountInWords}</p>
        <table><thead><tr><th>Forma de pago</th><th>Plazo</th><th>Unidad</th><th>Valor</th></tr></thead><tbody><tr><td>{data.paymentMethod}</td><td>{data.paymentTerm}</td><td>{data.paymentUnit}</td><td>{data.total}</td></tr></tbody></table>
      </div>
      <table><tbody><tr><td>Subtotal</td><td>{data.subtotal}</td></tr><tr><td>Descuento</td><td>{data.discount}</td></tr><tr><td>IVA</td><td>{data.tax}</td></tr><tr><th>VALOR TOTAL $</th><th>{data.total}</th></tr></tbody></table>
    </section>,
    legal: <section className="expense-document-legal">{design.legalText}</section>,
    signatures: <section className="expense-document-signatures"><div><span /><b>RECIBÍ CONFORME</b><small>{data.owner}</small></div><div><span /><b>ENTREGADO POR</b><small>ADMINISTRACIÓN</small></div></section>,
  }

  return <article className={`expense-document ${large ? 'large' : ''} ${className}`.trim()} style={style}>
    {design.blocks.filter(block => block.visible).map(block => <div key={block.id} className={`expense-block-${block.id}`}>
      {blocks[block.id]}
      {design.blockTexts[block.id] && <p className="expense-block-custom-text">{design.blockTexts[block.id]}</p>}
    </div>)}
  </article>
}
