import InfoOutlined from '@mui/icons-material/InfoOutlined'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { WHEN_NARROW_TABLET_MAP, WHEN_TABLET_MAP } from './tabletMap'

const EXPLANATION =
  'The status shows the weather along all the routes at this clock hour, wherever the truck is. The truck marker shows where the truck would be. Checkpoint dots show conditions when the truck arrives.'
const TOUCH_TOOLTIP_MS = 6000

const HIDDEN_ON_TABLET_MAP = { [WHEN_TABLET_MAP]: { display: 'none' } }
const SHOWN_ONLY_ON_TABLET_MAP = { display: 'none', [WHEN_TABLET_MAP]: { display: 'inline' } }

function ZoneNote({ zoneName }: { zoneName: string }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ [WHEN_TABLET_MAP]: { lineHeight: 1.3 } }}
    >
      <Box component="span" sx={HIDDEN_ON_TABLET_MAP}>
        {`Times shown in the origin's time zone (${zoneName})`}
      </Box>
      <Box component="span" sx={SHOWN_ONLY_ON_TABLET_MAP}>
        {`Origin time zone (${zoneName})`}
      </Box>
    </Typography>
  )
}

// On a tablet-sized map the caption is two short lines, so the panel does not grow a row for it.
export function ForecastCaption({ zoneName }: { zoneName: string }) {
  return (
    <Stack
      direction="row"
      useFlexGap
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 1,
        [WHEN_NARROW_TABLET_MAP]: { flexDirection: 'column', alignItems: 'flex-start', rowGap: 0 },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', columnGap: 1 }}>
        <Typography variant="subtitle2" component="span">
          Forecast time
        </Typography>
        <Tooltip title={EXPLANATION} enterTouchDelay={0} leaveTouchDelay={TOUCH_TOOLTIP_MS}>
          <IconButton
            size="small"
            aria-label="What the forecast time shows"
            sx={{ [WHEN_TABLET_MAP]: { marginBlock: -1.25 } }}
          >
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <ZoneNote zoneName={zoneName} />
    </Stack>
  )
}
