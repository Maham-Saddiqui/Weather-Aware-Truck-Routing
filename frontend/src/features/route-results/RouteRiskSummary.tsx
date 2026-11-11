import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Route } from '../../shared/types'
import { RiskChip } from './RiskChip'

export function RouteRiskSummary({ summary }: { summary: Route['summary'] }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography variant="body2">
        {summary.average_risk === null
          ? 'Average risk —'
          : `Average risk ${summary.average_risk} of 4`}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2">Worst</Typography>
        {summary.worst_level ? <RiskChip level={summary.worst_level} /> : <span>—</span>}
      </Stack>
    </Stack>
  )
}
