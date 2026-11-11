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

const BANDS = [
  ['Low', 'below 25', 'below 0.10', 'below 0.5'],
  ['Moderate', '25 to 34', '0.10 to below 0.25', '0.5 to below 1.0'],
  ['High', '35 to 44', '0.25 to below 0.50', '1.0 to below 2.0'],
  ['Severe', '45 to 54', '0.50 to 1.00', '2.0 to 3.0'],
  ['No Travel', '55 or more', 'above 1.00', 'above 3.0'],
] as const

const EXPLANATIONS = [
  'Every checkpoint gets the worst of its wind, rain and snow ratings. Gusts are shown for information only.',
  'A heavy load makes wind worse. Wind of 35 to 44 mph with cargo over 40,000 lb is Severe. Wind of 45 to 54 mph with cargo over 30,000 lb is No Travel. Wind of 55 mph or more is No Travel for any load.',
  'A checkpoint with a missing reading shows "No data", unless the readings it has already reach No Travel.',
  'A route with a No Travel checkpoint, or with more than 10% of its miles lacking weather data, is never recommended.',
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
      <DialogContent>
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
            {BANDS.map(([level, wind, rain, snow]) => (
              <TableRow key={level}>
                <TableCell component="th" scope="row">
                  {level}
                </TableCell>
                <TableCell>{wind}</TableCell>
                <TableCell>{rain}</TableCell>
                <TableCell>{snow}</TableCell>
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
