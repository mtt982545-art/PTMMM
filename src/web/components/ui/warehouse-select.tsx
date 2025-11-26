import React from 'react'

interface WarehouseSelectProps { name: string; warehouseIds: string[]; defaultValue?: string; placeholder?: string; placeholderLabel?: string }
function WarehouseSelect({ name, warehouseIds, defaultValue, placeholder, placeholderLabel }: WarehouseSelectProps) {
  if (!warehouseIds || warehouseIds.length === 0) {
    return <input name={name} defaultValue={defaultValue || ''} className="ui-input" placeholder={placeholder || 'Warehouse ID'} />
  }
  const def = defaultValue && warehouseIds.includes(defaultValue) ? defaultValue : warehouseIds[0]
  return (
    <select name={name} className="ui-input" defaultValue={def} aria-label={placeholderLabel || 'Warehouse'}>
      {placeholderLabel ? (<option value="" disabled>{placeholderLabel}</option>) : null}
      {warehouseIds.map((wid) => (
        <option key={wid} value={wid}>{wid}</option>
      ))}
    </select>
  )
}
export default React.memo(WarehouseSelect)
