import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import RouteIcon from '@mui/icons-material/AltRoute'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { alpha, styled } from '@mui/material/styles'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

const BRAND_MARK_SIZE_PX = 36
const TAGLINE =
  'Compare up to three truck routes by the weather you will actually meet, hour by hour.'

const HeaderBar = styled(Toolbar)(({ theme }) => ({
  gap: theme.spacing(1),
  flexWrap: 'wrap',
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

export function Header({ onOpenRiskInfo, onOpenCredits }: HeaderProps) {
  return (
    <AppBar position="static" color="transparent" elevation={0} enableColorOnDark>
      <HeaderBar>
        <BrandMark>
          <RouteIcon color="primary" aria-hidden />
        </BrandMark>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            component="h1"
            variant="h1"
            sx={{ fontSize: { xs: '1.0625rem', sm: '1.25rem' } }}
          >
            Weather-Aware Truck Routing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {TAGLINE}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<InfoOutlinedIcon />} onClick={onOpenRiskInfo} color="inherit">
            How risk works
          </Button>
          <Button onClick={onOpenCredits} color="inherit">
            Credits
          </Button>
        </Stack>
      </HeaderBar>
    </AppBar>
  )
}
