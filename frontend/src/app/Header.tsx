import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import RouteIcon from '@mui/icons-material/AltRoute'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { alpha, styled, useTheme } from '@mui/material/styles'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { MIN_TOUCH_TARGET_PX } from '../shared/constants'
import { VISUALLY_HIDDEN_STYLE } from '../shared/visuallyHidden'

const BRAND_MARK_SIZE_PX = 36
const TAGLINE =
  'Compare up to three truck routes by the weather you will actually meet, hour by hour.'

const HeaderBar = styled(Toolbar)(({ theme }) => ({
  gap: theme.spacing(1),
  flexWrap: 'wrap',
  [theme.breakpoints.down('md')]: { flexWrap: 'nowrap' },
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}))

const BrandMark = styled('span')(({ theme }) => ({
  display: 'grid',
  placeItems: 'center',
  width: BRAND_MARK_SIZE_PX,
  height: BRAND_MARK_SIZE_PX,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.primary.main, 0.14),
}))

interface HeaderProps {
  onOpenRiskInfo: () => void
  onOpenCredits: () => void
}

const ICON_ONLY_BUTTON = {
  minWidth: MIN_TOUCH_TARGET_PX,
  '& .MuiButton-startIcon': { margin: 0 },
} as const

function HeaderTitle({ isPhone }: { isPhone: boolean }) {
  return (
    <Box sx={{ flexGrow: 1, minWidth: 0, position: 'relative' }}>
      <Typography component="h1" variant="h1" sx={{ fontSize: { xs: '1.0625rem', sm: '1.25rem' } }}>
        Weather-Aware Truck Routing
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={isPhone ? VISUALLY_HIDDEN_STYLE : undefined}
      >
        {TAGLINE}
      </Typography>
    </Box>
  )
}

function HeaderLinks({
  isPhone,
  onOpenRiskInfo,
  onOpenCredits,
}: HeaderProps & { isPhone: boolean }) {
  return (
    <Stack direction="row" spacing={isPhone ? 0 : 1}>
      <Button
        startIcon={<InfoOutlinedIcon />}
        onClick={onOpenRiskInfo}
        color="inherit"
        aria-label="How risk works"
        title={isPhone ? 'How risk works' : undefined}
        sx={isPhone ? ICON_ONLY_BUTTON : undefined}
      >
        {!isPhone && 'How risk works'}
      </Button>
      <Button onClick={onOpenCredits} color="inherit">
        Credits
      </Button>
    </Stack>
  )
}

// On a phone the title and both links share one row: the tagline stays for screen readers and "How risk works" shrinks to its icon.
export function Header(props: HeaderProps) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('md'))
  return (
    <AppBar position="static" color="transparent" elevation={0} enableColorOnDark>
      <HeaderBar>
        <BrandMark>
          <RouteIcon color="primary" aria-hidden />
        </BrandMark>
        <HeaderTitle isPhone={isPhone} />
        <HeaderLinks isPhone={isPhone} {...props} />
      </HeaderBar>
    </AppBar>
  )
}
