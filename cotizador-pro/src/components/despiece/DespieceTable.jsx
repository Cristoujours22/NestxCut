import TableSheet from '../sheet/TableSheet';
import { DESPIECE_ACTIONS_COLUMN, DESPIECE_COLUMNS, DESPIECE_HEADER_GROUPS } from '../../features/despiece/config/despieceColumns';
import { createDespieceRow } from '../../features/despiece/utils/despieceRow';

function DespieceTable({ allowedCantoRefs = [], ...props }) {
  const columns = DESPIECE_COLUMNS.map((column) => (
    ['l1', 'l2', 'a1', 'a2'].includes(column.key)
      ? { ...column, allowedValues: allowedCantoRefs.map(String) }
      : column
  ));

  return (
    <TableSheet
      tableId="despiece-table"
      columns={columns}
      headerGroups={DESPIECE_HEADER_GROUPS}
      actionsColumn={DESPIECE_ACTIONS_COLUMN}
      createRow={createDespieceRow}
      {...props}
    />
  );
}

export default DespieceTable;
