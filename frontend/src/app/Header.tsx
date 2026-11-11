import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import RouteIcon from '@mui/icons-material/AltRoute'
import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

interface HeaderProps {
  onOpenRiskInfo: () => void
  onOpenCredits: () => void
}

export function Header({ onOpenRiskInfo, onOpenCredits }: HeaderProps) {
  return (
    <AppBar position="static" color="transparent" elevation={0} enableColorOnDark>
      <Toolbar
        sx={{
          gap: 1,
          flexWrap: 'wrap',
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <RouteIcon color="primary" aria-hidden />
        <Typography component="h1" variant="h1" sx={{ flexGrow: 1, minWidth: 0 }}>
          Weather-Aware Truck Routing
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<InfoOutlinedIcon />} onClick={onOpenRiskInfo} color="inherit">
            How risk works
          </Button>
          <Button onClick={onOpenCredits} color="inherit">
            Credits
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
