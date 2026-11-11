import InfoOutlined from '@mui/icons-material/InfoOutlined'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

const EXPLANATION =
  'The status shows the weather along all the routes at this clock hour, wherever the truck is. The truck marker shows where the truck would be. Checkpoint dots show conditions when the truck arrives.'
const TOUCH_TOOLTIP_MS = 6000

export function ForecastCaption() {
  return (
    <Stack direction="row" sx={{ alignItems: 'center' }}>
      <Typography variant="subtitle2">Forecast time</Typography>
      <Tooltip title={EXPLANATION} enterTouchDelay={0} leaveTouchDelay={TOUCH_TOOLTIP_MS}>
        <IconButton size="small" aria-label="What the forecast time shows">
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}
