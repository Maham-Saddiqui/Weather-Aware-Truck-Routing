import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { DRIVING_TIME_NOTICE } from '../shared/constants'
import {
  MAX_MISSING_DATA_PERCENT,
  NO_TRAVEL_ANY_LOAD_WIND_MPH,
  NO_TRAVEL_HEAVY_LOAD_LB,
  pounds,
  rainOrSnowBands,
  RAIN_EDGES_IN_PER_HOUR,
  SEVERE_HEAVY_LOAD_LB,
  SNOW_EDGES_IN_PER_HOUR,
  windBands,
  WIND_EDGES_MPH,
} from './riskRuleNumbers'

const LEVELS = ['Low', 'Moderate', 'High', 'Severe', 'No Travel'] as const

const WIND_BANDS = windBands(WIND_EDGES_MPH)
const RAIN_BANDS = rainOrSnowBands(RAIN_EDGES_IN_PER_HOUR)
const SNOW_BANDS = rainOrSnowBands(SNOW_EDGES_IN_PER_HOUR)

const [, HIGH_WIND_FROM, SEVERE_WIND_FROM, NO_TRAVEL_WIND_FROM] = WIND_EDGES_MPH
const WIND_UP_TO = (edge: number) => String(edge - 1)

const EXPLANATIONS = [
  'Every checkpoint gets the worst of its wind, rain and snow ratings. Gusts are shown for information only.',
  `A heavy load makes wind worse. Wind of ${String(HIGH_WIND_FROM)} to ${WIND_UP_TO(SEVERE_WIND_FROM)} mph with cargo over ${pounds(SEVERE_HEAVY_LOAD_LB)} lb is Severe. Wind of ${String(SEVERE_WIND_FROM)} to ${WIND_UP_TO(NO_TRAVEL_WIND_FROM)} mph with cargo over ${pounds(NO_TRAVEL_HEAVY_LOAD_LB)} lb is No Travel. Wind of ${String(NO_TRAVEL_ANY_LOAD_WIND_MPH)} mph or more is No Travel for any load.`,
  'A checkpoint with a missing reading shows "No data", unless the readings it has already reach No Travel.',
  'Average risk is a score from 0 to 4. Each level counts as its number (Low 0, Moderate 1, High 2, Severe 3, No Travel 4), weighted by the miles at that level.',
  `A route with a No Travel checkpoint, or with more than ${String(MAX_MISSING_DATA_PERCENT)}% of its miles lacking weather data, is never recommended.`,
  'Among the other routes the order is: fewest Severe miles, then fewest High miles, then lowest average risk, then shortest travel time.',
  DRIVING_TIME_NOTICE,
]

interface RiskInfoDialogProps {
  open: boolean
  onClose: () => void
}

export function RiskInfoDialog({ open, onClose }: RiskInfoDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="risk-info-title">
      <DialogTitle id="risk-info-title">How risk is calculated</DialogTitle>
      <DialogContent tabIndex={0} role="region" aria-label="Risk rules">
        <Table size="small" aria-label="Risk levels by weather reading">
          <TableHead>
            <TableRow>
              <TableCell>Level</TableCell>
              <TableCell>Wind (mph)</TableCell>
              <TableCell>Rain (in/hr)</TableCell>
              <TableCell>Snow (in/hr)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {LEVELS.map((level, position) => (
              <TableRow key={level}>
                <TableCell component="th" scope="row">
                  {level}
                </TableCell>
                <TableCell>{WIND_BANDS[position]}</TableCell>
                <TableCell>{RAIN_BANDS[position]}</TableCell>
                <TableCell>{SNOW_BANDS[position]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {EXPLANATIONS.map((text) => (
          <Typography key={text} variant="body2" sx={{ mt: 1.5 }}>
            {text}
          </Typography>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
